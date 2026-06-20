document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('cursorCanvas');
    const ctx = canvas.getContext('2d');
    
    let currentShape = 'squircle';
    let squircleRoundness = 4;
    let solidFillColor = '#ffffff';
    let fillOpacity = 1;
    let outlineColor = '#4299e1';
    let outlineOpacity = 1;
    let borderThickness = 10;
    let glowColor = '#4299e1';
    let glowAmount = 0.5;
    let uploadedImage = null;
    let imageScale = 1;
    let imageOpacity = 1;
    let imageRotation = 0;
    let imageOffsetX = 0;
    let imageOffsetY = 0;
    let copiedColors = null;

    const syncSliderInput = (slider, input, callback) => {
        const isInt = slider.step === "1";
        const precision = isInt ? 0 : 2;
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            input.value = value.toFixed(precision);
            callback(value);
        });
        input.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value)) {
                slider.value = value;
                callback(value);
            }
        });
    };

    const updateControlsVisibility = () => {
        const isSolidFillActive = document.getElementById('useSolidFill').checked;
        const isGradientFillActive = document.getElementById('useGradientFill').checked;
        const isGradientOutlineActive = document.getElementById('useGradientOutline').checked;
        const isGlowActive = document.getElementById('addGlow').checked;
        const isOutlineGlowActive = document.getElementById('useOutlineGlow').checked;
        const isSquircle = currentShape === 'squircle';

        document.getElementById('solid-fill-options').classList.toggle('hidden', !isSolidFillActive);
        document.getElementById('gradient-fill-options').classList.toggle('hidden', !isGradientFillActive);
        document.getElementById('solidFillColorContainer').classList.toggle('hidden', isGradientFillActive);
        document.getElementById('gradient-outline-options').classList.toggle('hidden', !isGradientOutlineActive);
        document.getElementById('solid-outline-options').classList.toggle('hidden', isGradientOutlineActive);
        document.getElementById('glow-options').classList.toggle('hidden', !isGlowActive);
        document.getElementById('glow-color-option').classList.toggle('hidden', isOutlineGlowActive);
        document.getElementById('squircle-options').classList.toggle('hidden', !isSquircle);
        
        document.getElementById('useOutlineGradientFillOption').classList.toggle('hidden', !(isGradientFillActive && isGradientOutlineActive));
        document.getElementById('useFillGradientOutlineOption').classList.toggle('hidden', !(isGradientFillActive && isGradientOutlineActive));
        
        document.getElementById('smoothFillContainer').classList.toggle('hidden', !isGradientFillActive);
        document.getElementById('smoothOutlineContainer').classList.toggle('hidden', !isGradientOutlineActive);
        
        document.getElementById('image-options').classList.toggle('hidden', !uploadedImage);
        document.getElementById('removeImageBtn').classList.toggle('hidden', !uploadedImage);
    };

    const hexToRgbA = (hex, alpha) => {
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length === 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
        }
        return `rgba(0,0,0,${alpha})`;
    };

    const getGradientColors = (container) => {
        return Array.from(container.querySelectorAll('input[type="color"]')).map(input => input.value);
    };

    const drawShape = (path, center, size) => {
        switch (currentShape) {
            case 'squircle':
                const n = squircleRoundness;
                const r = size / 2;
                path.moveTo(center.x + r, center.y);
                for (let i = 0; i <= 360; i++) {
                    const angle = (i * Math.PI) / 180;
                    const cos_t = Math.cos(angle);
                    const sin_t = Math.sin(angle);
                    const x = center.x + r * Math.sign(cos_t) * Math.pow(Math.abs(cos_t), 2 / n);
                    const y = center.y + r * Math.sign(sin_t) * Math.pow(Math.abs(sin_t), 2 / n);
                    path.lineTo(x, y);
                }
                path.closePath();
                break;
            case 'circle':
                path.arc(center.x, center.y, size / 2, 0, 2 * Math.PI);
                break;
            case 'square':
                const s = size; 
                path.rect(center.x - s / 2, center.y - s / 2, s, s);
                break;
            case 'triangle':
                const side = size;
                const height = side * Math.sqrt(3) / 2;
                const centroidOffset = height / 6; 
                path.moveTo(center.x, center.y - height / 2 - centroidOffset);
                path.lineTo(center.x - side / 2, center.y + height / 2 - centroidOffset);
                path.lineTo(center.x + side / 2, center.y + height / 2 - centroidOffset);
                path.closePath();
                break;
            case 'star':
                const outerRadius = size / 2;
                const innerRadius = outerRadius * 0.4;
                for (let i = 0; i < 10; i++) {
                    const angle = (i * Math.PI) / 5;
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const x = center.x + radius * Math.cos(angle - Math.PI / 2);
                    const y = center.y + radius * Math.sin(angle - Math.PI / 2);
                    if (i === 0) path.moveTo(x, y);
                    else path.lineTo(x, y);
                }
                path.closePath();
                break;
            case 'hexagon':
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const x = center.x + (size / 2) * Math.cos(angle);
                    const y = center.y + (size / 2) * Math.sin(angle);
                    if (i === 0) path.moveTo(x, y);
                    else path.lineTo(x, y);
                }
                path.closePath();
                break;
            case 'heart':
                const heartScale = size / 32;
                const heartOffsetY = -2 * heartScale; 
                for (let t = 0; t <= 2 * Math.PI; t += 0.01) {
                    const x = 16 * Math.pow(Math.sin(t), 3);
                    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
                    if (t === 0) {
                        path.moveTo(center.x + x * heartScale, center.y - y * heartScale + heartOffsetY);
                    } else {
                        path.lineTo(center.x + x * heartScale, center.y - y * heartScale + heartOffsetY);
                    }
                }
                path.closePath();
                break;
            case 'diamond':
                path.moveTo(center.x, center.y - size/2);
                path.lineTo(center.x + size/2, center.y);
                path.lineTo(center.x, center.y + size/2);
                path.lineTo(center.x - size/2, center.y);
                path.closePath();
                break;
            case 'pentagon':
                for (let i = 0; i < 5; i++) {
                    const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
                    const x = center.x + (size / 2) * Math.cos(angle);
                    const y = center.y + (size / 2) * Math.sin(angle);
                    if (i === 0) path.moveTo(x, y);
                    else path.lineTo(x, y);
                }
                path.closePath();
                break;
            case 'trapezoid':
                const widthTop = size * 0.5;
                const widthBottom = size * 0.9;
                const heightTrapezoid = size * 0.7;
                path.moveTo(center.x - widthTop/2, center.y - heightTrapezoid/2);
                path.lineTo(center.x + widthTop/2, center.y - heightTrapezoid/2);
                path.lineTo(center.x + widthBottom/2, center.y + heightTrapezoid/2);
                path.lineTo(center.x - widthBottom/2, center.y + heightTrapezoid/2);
                path.closePath();
                break;
        }
    };

    const calculateImageFit = (img, containerSize) => {
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight;

        if (imgAspect > 1) {
            drawWidth = containerSize;
            drawHeight = containerSize / imgAspect;
        } else {
            drawHeight = containerSize;
            drawWidth = containerSize * imgAspect;
        }
        return { width: drawWidth, height: drawHeight };
    };

    // Helper: draw banded (non-smooth) gradient fill.
    // Strategy: build a single composite offscreen where each band is painted separately
    // using clip(rect) + clip(path) + fill. Because we clip to the SHAPE first and then
    // the band rect, fill anti-aliasing is computed correctly inside the shape boundary.
    // The result is blitted to the destination in one pass, avoiding edge accumulation.
    const drawBandedFill = (renderCtx, path, colors, topY, totalHeight, opacity, canvasWidth) => {
        const canvasHeight = renderCtx.canvas.height;
        const sections = colors.length;
        const sectionHeight = totalHeight / sections;

        // Single offscreen for all bands
        const off = document.createElement('canvas');
        off.width = canvasWidth;
        off.height = canvasHeight;
        const offCtx = off.getContext('2d');

        colors.forEach((color, index) => {
            offCtx.save();
            // Clip to shape first, then band rect — intersection = filled band inside shape.
            // First band extends to Y=0, last to canvasHeight, so shapes whose geometry
            // extends beyond the gradient span (e.g. triangle apex) are never clipped.
            offCtx.clip(path);
            const isFirst = index === 0;
            const isLast  = index === colors.length - 1;
            const bandTop    = isFirst ? 0 : topY + index * sectionHeight;
            const bandBottom = isLast  ? canvasHeight : topY + (index + 1) * sectionHeight;
            const band = new Path2D();
            band.rect(0, bandTop, canvasWidth, bandBottom - bandTop);
            offCtx.clip(band);
            offCtx.fillStyle = hexToRgbA(color, opacity);
            offCtx.fillRect(0, 0, canvasWidth, canvasHeight);
            offCtx.restore();
        });

        // Blit the fully composed offscreen to the destination in one go
        renderCtx.drawImage(off, 0, 0);
    };

    // Helper: draw banded (non-smooth) gradient stroke without clipping the path directly.
    // Each color band is rendered as a full stroke on an offscreen, then only that band's
    // Y-slice is blitted to the destination.
    //
    // STROKE BLEED: a stroke of lineWidth renders lineWidth/2 outside the path on every side.
    // So the actual pixel extent is [topY - half, topY + totalHeight + half].
    // We expand the first band upward by `half` and the last band downward by `half`
    // so no stroke pixels fall outside all blit zones.
    const drawBandedStroke = (renderCtx, path, colors, topY, totalHeight, opacity, lineWidth, canvasWidth) => {
        const canvasHeight = renderCtx.canvas.height;
        const sections = colors.length;
        const sectionHeight = totalHeight / sections;
        const half = lineWidth / 2;

        colors.forEach((color, index) => {
            const off = document.createElement('canvas');
            off.width = canvasWidth;
            off.height = canvasHeight;
            const offCtx = off.getContext('2d');

            offCtx.strokeStyle = hexToRgbA(color, opacity);
            offCtx.lineWidth = lineWidth;
            offCtx.stroke(path);

            // Band slice boundaries.
            // Interior band edges stay exact so colours meet cleanly.
            // First band extends to Y=0, last band extends to canvasHeight,
            // so ANY stroke pixels above/below the gradient span (e.g. triangle apex,
            // thick stroke bleed on non-rectangular shapes) are always captured.
            const isFirst = index === 0;
            const isLast  = index === sections - 1;
            const sliceTop    = isFirst ? 0 : topY + index * sectionHeight;
            const sliceBottom = isLast  ? canvasHeight : topY + (index + 1) * sectionHeight;
            const sliceHeight = sliceBottom - sliceTop;

            renderCtx.drawImage(
                off,
                0, sliceTop,
                canvasWidth, sliceHeight,
                0, sliceTop,
                canvasWidth, sliceHeight
            );
        });
    };

    const drawCursor = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const center = { x: canvas.width / 2, y: canvas.height / 2 };
        
        const maxDimension = Math.min(canvas.width, canvas.height);
        const baseSize = Math.min(300, maxDimension - 40); 
        
        const shapeSize = baseSize - borderThickness;
        
        // Gradient geometry — same span used for both smooth and banded modes
        const gradTopY = center.y - shapeSize / 2;
        const gradHeight = shapeSize;
        const canvasW = canvas.width;

        const fillPath = new Path2D();
        drawShape(fillPath, center, shapeSize);
        
        let fillDrawn = false;
        if (document.getElementById('useSolidFill').checked) {
            if (document.getElementById('useGradientFill').checked) {
                let colors;
                
                if (document.getElementById('useOutlineGradientFill').checked && document.getElementById('useGradientOutline').checked) {
                    colors = getGradientColors(document.getElementById('gradient-outline-colors'));
                } else {
                    colors = getGradientColors(document.getElementById('gradient-fill-colors'));
                }
                
                if (colors.length > 1) {
                    if (document.getElementById('useSmoothFillGradient').checked) {
                        const gradient = ctx.createLinearGradient(0, gradTopY, 0, gradTopY + gradHeight);
                        const step = 1 / (colors.length - 1);
                        colors.forEach((color, index) => {
                            gradient.addColorStop(step * index, hexToRgbA(color, fillOpacity));
                        });
                        ctx.fillStyle = gradient;
                        ctx.fill(fillPath);
                    } else {
                        drawBandedFill(ctx, fillPath, colors, gradTopY, gradHeight, fillOpacity, canvasW);
                    }
                    fillDrawn = true;
                }
            }
            if (!fillDrawn) {
                ctx.fillStyle = hexToRgbA(solidFillColor, fillOpacity);
                ctx.fill(fillPath);
            }
        }
        
        if (uploadedImage) {
            ctx.save();
            ctx.clip(fillPath);
            ctx.globalAlpha = imageOpacity;
            
            const fit = calculateImageFit(uploadedImage, shapeSize);
            
            const finalWidth = fit.width * imageScale;
            const finalHeight = fit.height * imageScale;

            ctx.translate(center.x + imageOffsetX, center.y + imageOffsetY);
            ctx.rotate(imageRotation * Math.PI / 180);
            
            ctx.drawImage(uploadedImage, -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight);
            
            ctx.restore();
        }

        const outlinePath = new Path2D();
        drawShape(outlinePath, center, shapeSize);

        if (document.getElementById('addGlow').checked) {
            let currentGlowColor;
            if (document.getElementById('useOutlineGlow').checked) {
                if (document.getElementById('useGradientOutline').checked) {
                    let colors;
                    if (document.getElementById('useFillGradientOutline').checked && document.getElementById('useGradientFill').checked) {
                        colors = getGradientColors(document.getElementById('gradient-fill-colors'));
                    } else {
                        colors = getGradientColors(document.getElementById('gradient-outline-colors'));
                    }
                    currentGlowColor = colors.length > 0 ? colors[0] : outlineColor;
                } else {
                    currentGlowColor = outlineColor;
                }
            } else {
                currentGlowColor = glowColor;
            }
            ctx.shadowBlur = borderThickness * 2 * glowAmount;
            ctx.shadowColor = currentGlowColor;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }

        if (borderThickness > 0) {
            ctx.lineWidth = borderThickness;
            
            if (document.getElementById('useGradientOutline').checked) {
                let colors;
                if (document.getElementById('useFillGradientOutline').checked && document.getElementById('useGradientFill').checked) {
                    colors = getGradientColors(document.getElementById('gradient-fill-colors'));
                } else {
                    colors = getGradientColors(document.getElementById('gradient-outline-colors'));
                }
                
                if (colors.length > 1) {
                    if (document.getElementById('useSmoothOutlineGradient').checked) {
                        const gradient = ctx.createLinearGradient(0, gradTopY, 0, gradTopY + gradHeight);
                        const step = 1 / (colors.length - 1);
                        colors.forEach((color, index) => {
                            gradient.addColorStop(step * index, hexToRgbA(color, outlineOpacity));
                        });
                        ctx.strokeStyle = gradient;
                        ctx.stroke(outlinePath);
                    } else {
                        drawBandedStroke(ctx, outlinePath, colors, gradTopY, gradHeight, outlineOpacity, borderThickness, canvasW);
                    }
                } else if (colors.length === 1) {
                    ctx.strokeStyle = hexToRgbA(colors[0], outlineOpacity);
                    ctx.stroke(outlinePath);
                } else {
                    ctx.strokeStyle = hexToRgbA(outlineColor, outlineOpacity);
                    ctx.stroke(outlinePath);
                }
            } else {
                ctx.strokeStyle = hexToRgbA(outlineColor, outlineOpacity);
                ctx.stroke(outlinePath);
            }
        }
        
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    };

    const addGradientColorInput = (container, defaultColor) => {
        const colorWrapper = document.createElement('div');
        colorWrapper.className = 'gradient-color-input-group';
        colorWrapper.innerHTML = `
            <input type="color" value="${defaultColor}">
            <button class="btn-copy" title="copy">copy</button>
            <button class="btn-paste" title="paste">paste</button>
            <button class="remove-gradient-color-btn">&times;</button>
        `;
        container.appendChild(colorWrapper);
        
        const colorInput = colorWrapper.querySelector('input');
        const copyBtn = colorWrapper.querySelector('.btn-copy');
        const pasteBtn = colorWrapper.querySelector('.btn-paste');
        const removeBtn = colorWrapper.querySelector('.remove-gradient-color-btn');
        
        colorInput.addEventListener('input', drawCursor);
        
        copyBtn.addEventListener('click', () => {
            copiedColors = { colors: [colorInput.value], source: container };
            copyBtn.textContent = 'done';
            setTimeout(() => { copyBtn.textContent = 'copy'; }, 1000);
        });
        
        pasteBtn.addEventListener('click', () => {
            if (copiedColors && copiedColors.colors && copiedColors.colors.length > 0) {
                colorInput.value = copiedColors.colors[0];
                drawCursor();
                pasteBtn.textContent = 'done';
                setTimeout(() => { pasteBtn.textContent = 'paste'; }, 1000);
            }
        });
        
        removeBtn.addEventListener('click', () => {
            if (container.children.length > 1) {
                colorWrapper.remove();
                drawCursor();
            }
        });
        
        drawCursor();
    };

    const initializeGradientColors = (container, colorsArray) => {
        container.innerHTML = '';
        colorsArray.forEach(color => {
            addGradientColorInput(container, color);
        });
    };

    initializeGradientColors(document.getElementById('gradient-fill-colors'), ['#ff0000', '#0000ff']);
    initializeGradientColors(document.getElementById('gradient-outline-colors'), ['#00ff00', '#0000ff']);

    syncSliderInput(document.getElementById('fillOpacity'), document.getElementById('fillOpacityInput'), (v) => { fillOpacity = v; drawCursor(); });
    syncSliderInput(document.getElementById('outlineOpacity'), document.getElementById('outlineOpacityInput'), (v) => { outlineOpacity = v; drawCursor(); });
    syncSliderInput(document.getElementById('borderThickness'), document.getElementById('borderThicknessInput'), (v) => { borderThickness = v; drawCursor(); });
    syncSliderInput(document.getElementById('glowAmount'), document.getElementById('glowAmountInput'), (v) => { glowAmount = v; drawCursor(); });
    syncSliderInput(document.getElementById('imageScale'), document.getElementById('imageScaleInput'), (v) => { imageScale = v; drawCursor(); });
    syncSliderInput(document.getElementById('imageOpacity'), document.getElementById('imageOpacityInput'), (v) => { imageOpacity = v; drawCursor(); });
    syncSliderInput(document.getElementById('imageRotation'), document.getElementById('imageRotationInput'), (v) => { imageRotation = v; drawCursor(); });
    syncSliderInput(document.getElementById('imageOffsetX'), document.getElementById('imageOffsetXInput'), (v) => { imageOffsetX = v; drawCursor(); });
    syncSliderInput(document.getElementById('imageOffsetY'), document.getElementById('imageOffsetYInput'), (v) => { imageOffsetY = v; drawCursor(); });
    syncSliderInput(document.getElementById('squircleRoundness'), document.getElementById('squircleRoundnessInput'), (v) => { squircleRoundness = v; drawCursor(); });

    document.querySelectorAll('.shape-button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.shape-button').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            currentShape = btn.dataset.shape;
            updateControlsVisibility();
            drawCursor();
        });
    });

    document.getElementById('useSolidFill').addEventListener('change', () => { updateControlsVisibility(); drawCursor(); });
    document.getElementById('useGradientFill').addEventListener('change', (e) => {
        if (e.target.checked && document.getElementById('useOutlineGradientFill').checked) {
            document.getElementById('useOutlineGradientFill').checked = false;
        }
        updateControlsVisibility();
        drawCursor();
    });
    document.getElementById('useGradientOutline').addEventListener('change', (e) => {
        if (e.target.checked && document.getElementById('useFillGradientOutline').checked) {
            document.getElementById('useFillGradientOutline').checked = false;
        }
        updateControlsVisibility();
        drawCursor();
    });
    document.getElementById('useOutlineGradientFill').addEventListener('change', (e) => {
        if (e.target.checked) document.getElementById('useFillGradientOutline').checked = false;
        drawCursor();
    });
    document.getElementById('useFillGradientOutline').addEventListener('change', (e) => {
        if (e.target.checked) document.getElementById('useOutlineGradientFill').checked = false;
        drawCursor();
    });
    document.getElementById('addGlow').addEventListener('change', () => { updateControlsVisibility(); drawCursor(); });
    document.getElementById('useOutlineGlow').addEventListener('change', () => { updateControlsVisibility(); drawCursor(); });
    document.getElementById('useSmoothFillGradient').addEventListener('change', drawCursor);
    document.getElementById('useSmoothOutlineGradient').addEventListener('change', drawCursor);

    document.getElementById('solidFillColor').addEventListener('input', (e) => { solidFillColor = e.target.value; drawCursor(); });
    document.getElementById('outlineColor').addEventListener('input', (e) => { outlineColor = e.target.value; drawCursor(); });
    document.getElementById('glowColorInput').addEventListener('input', (e) => { glowColor = e.target.value; drawCursor(); });

    document.getElementById('addFillColor').addEventListener('click', () => {
        addGradientColorInput(document.getElementById('gradient-fill-colors'), '#000000');
    });
    document.getElementById('addOutlineColor').addEventListener('click', () => {
        addGradientColorInput(document.getElementById('gradient-outline-colors'), '#000000');
    });

    document.getElementById('imageUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    uploadedImage = img;
                    imageScale = 1;
                    document.getElementById('imageScale').value = imageScale;
                    document.getElementById('imageScaleInput').value = imageScale.toFixed(2);
                    drawCursor();
                    updateControlsVisibility();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('removeImageBtn').addEventListener('click', () => {
        uploadedImage = null;
        document.getElementById('imageUpload').value = '';
        updateControlsVisibility();
        drawCursor();
    });

    document.getElementById('downloadBtn').addEventListener('click', () => {
        const desiredDiameter = parseInt(document.getElementById('exportSize').value);
        const scaleFactor = desiredDiameter / 400; 
        
        const scaledBorderThickness = borderThickness * scaleFactor;
        
        const glowRadius = document.getElementById('addGlow').checked 
                           ? scaledBorderThickness * 2 * glowAmount 
                           : 0;
        
        const canvasSize = desiredDiameter + (2 * glowRadius) + 8;
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasSize;
        tempCanvas.height = canvasSize;
        const tempCtx = tempCanvas.getContext('2d');
        
        const center = { x: canvasSize / 2, y: canvasSize / 2 };
        const shapeSize = desiredDiameter - scaledBorderThickness; 

        // Gradient geometry — same span used for both smooth and banded modes
        const gradTopY = center.y - shapeSize / 2;
        const gradHeight = shapeSize;
        const canvasW = canvasSize;

        const fillPath = new Path2D();
        drawShape(fillPath, center, shapeSize);

        let fillDrawn = false;
        if (document.getElementById('useSolidFill').checked) {
            if (document.getElementById('useGradientFill').checked) {
                let colors;
                
                if (document.getElementById('useOutlineGradientFill').checked && document.getElementById('useGradientOutline').checked) {
                    colors = getGradientColors(document.getElementById('gradient-outline-colors'));
                } else {
                    colors = getGradientColors(document.getElementById('gradient-fill-colors'));
                }
                
                if (colors.length > 1) {
                    if (document.getElementById('useSmoothFillGradient').checked) {
                        const gradient = tempCtx.createLinearGradient(0, gradTopY, 0, gradTopY + gradHeight);
                        const step = 1 / (colors.length - 1);
                        colors.forEach((color, index) => {
                            gradient.addColorStop(step * index, hexToRgbA(color, fillOpacity));
                        });
                        tempCtx.fillStyle = gradient;
                        tempCtx.fill(fillPath);
                    } else {
                        drawBandedFill(tempCtx, fillPath, colors, gradTopY, gradHeight, fillOpacity, canvasW);
                    }
                    fillDrawn = true;
                }
            }
            if (!fillDrawn) {
                tempCtx.fillStyle = hexToRgbA(solidFillColor, fillOpacity);
                tempCtx.fill(fillPath);
            }
        }
        
        if (uploadedImage) {
            tempCtx.save();
            tempCtx.clip(fillPath);
            tempCtx.globalAlpha = imageOpacity;
            
            const fit = calculateImageFit(uploadedImage, shapeSize);
            
            const scaledWidth = fit.width * imageScale;
            const scaledHeight = fit.height * imageScale;
            
            const scaledOffsetX = imageOffsetX * scaleFactor;
            const scaledOffsetY = imageOffsetY * scaleFactor;

            tempCtx.translate(center.x + scaledOffsetX, center.y + scaledOffsetY);
            tempCtx.rotate(imageRotation * Math.PI / 180);
            tempCtx.drawImage(uploadedImage, -scaledWidth / 2, -scaledHeight / 2, scaledWidth, scaledHeight);
            
            tempCtx.restore();
        }

        const outlinePath = new Path2D();
        drawShape(outlinePath, center, shapeSize);

        if (document.getElementById('addGlow').checked) {
            let currentGlowColor = glowColor;
            if (document.getElementById('useOutlineGlow').checked) {
                if (document.getElementById('useGradientOutline').checked) {
                    let colors;
                    if (document.getElementById('useFillGradientOutline').checked && document.getElementById('useGradientFill').checked) {
                        colors = getGradientColors(document.getElementById('gradient-fill-colors'));
                    } else {
                        colors = getGradientColors(document.getElementById('gradient-outline-colors'));
                    }
                    if (colors.length > 0) currentGlowColor = colors[0];
                } else {
                    currentGlowColor = outlineColor;
                }
            }
            tempCtx.shadowBlur = scaledBorderThickness * 2 * glowAmount;
            tempCtx.shadowColor = currentGlowColor;
            tempCtx.shadowOffsetX = 0;
            tempCtx.shadowOffsetY = 0;
        }
        
        if (scaledBorderThickness > 0) {
            tempCtx.lineWidth = scaledBorderThickness;
            
            if (document.getElementById('useGradientOutline').checked) {
                let colors;
                if (document.getElementById('useFillGradientOutline').checked && document.getElementById('useGradientFill').checked) {
                    colors = getGradientColors(document.getElementById('gradient-fill-colors'));
                } else {
                    colors = getGradientColors(document.getElementById('gradient-outline-colors'));
                }
                
                if (colors.length > 1) {
                    if (document.getElementById('useSmoothOutlineGradient').checked) {
                        const gradient = tempCtx.createLinearGradient(0, gradTopY, 0, gradTopY + gradHeight);
                        const step = 1 / (colors.length - 1);
                        colors.forEach((color, index) => {
                            gradient.addColorStop(step * index, hexToRgbA(color, outlineOpacity));
                        });
                        tempCtx.strokeStyle = gradient;
                        tempCtx.stroke(outlinePath);
                    } else {
                        drawBandedStroke(tempCtx, outlinePath, colors, gradTopY, gradHeight, outlineOpacity, scaledBorderThickness, canvasW);
                    }
                } else if (colors.length === 1) {
                    tempCtx.strokeStyle = hexToRgbA(colors[0], outlineOpacity);
                    tempCtx.stroke(outlinePath);
                } else {
                    tempCtx.strokeStyle = hexToRgbA(outlineColor, outlineOpacity);
                    tempCtx.stroke(outlinePath);
                }
            } else {
                tempCtx.strokeStyle = hexToRgbA(outlineColor, outlineOpacity);
                tempCtx.stroke(outlinePath);
            }
        }
        
        tempCtx.shadowBlur = 0;
        tempCtx.shadowColor = 'transparent';
        
        const link = document.createElement('a');
        link.download = `cursor_${currentShape}_${desiredDiameter}.png`;
        link.href = tempCanvas.toDataURL();
        link.click();
    });

    updateControlsVisibility();
});