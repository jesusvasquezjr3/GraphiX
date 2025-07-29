class MathParser {
    parse(expression) {
        let expr = expression.toLowerCase().replace(/\s/g, '');
        const replacements = {
            'sin': 'Math.sin', 'cos': 'Math.cos', 'tan': 'Math.tan',
            'asin': 'Math.asin', 'acos': 'Math.acos', 'atan': 'Math.atan',
            'ln': 'Math.log', 'log': 'Math.log10', 'exp': 'Math.exp',
            'sqrt': 'Math.sqrt', 'abs': 'Math.abs', 'pi': 'Math.PI', 'e': 'Math.E'
        };
        for (const [key, value] of Object.entries(replacements)) {
            expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), value);
        }
        expr = expr.replace(/\^/g, '**');
        try {
            const func = new Function('x', `with(Math) { return ${expr}; }`);
            return func;
        } catch (e) {
            throw new Error(`Error de sintaxis en la expresión.`);
        }
    }
}

class GraphiX {
    constructor() {
        this.canvas = document.getElementById('graphCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.parser = new MathParser();
        
        this.equations = [];
        this.points = [];
        this.measurements = [];
        this.currentTool = null;
        this.tempPoints = [];
        this.colorIndex = 0;
        
        this.scale = 50;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };

        this.currentLanguage = 'es';
        this.translations = {
            es: {
                title: "GraphiX - Visualizador Matemático",
                theme: "🌓 Tema",
                origin: "⟲ Origen",
                export: "📷 Exportar",
                addEquation: "Agregar Ecuación",
                add: "Agregar",
                pointsTable: "Tabla de Puntos",
                pointsInstructions: "Añada puntos manualmente o importe un archivo .csv (dos columnas: x,y, sin encabezados).",
                addPoint: "Añadir Punto",
                importCsv: "Importar CSV",
                activeEquations: "Ecuaciones Activas",
                tools: "Herramientas",
                toolDistance: "Medir Distancia",
                toolAngle: "Medir Ángulo",
                toolClear: "Limpiar Medidas",
                position: "Posición",
                zoom: "Zoom",
                distanceResult: "Distancia",
                angleResult: "Ángulo",
                toolPromptDist: "Clic en 2 puntos",
                toolPromptAngle: "Clic en 3 puntos",
                errorSyntaxIncomplete: (expr) => `Error de sintaxis: La expresión '${expr}' está incompleta.`,
                errorInvalidExpression: (expr) => `Error: La expresión '${expr}' no es válida.`,
                errorCsvRows: (row) => `Error al procesar CSV: La fila ${row} no tiene 2 columnas.`,
                errorCsvValues: (row) => `Error al procesar CSV: La fila ${row} contiene valores no numéricos.`
            },
            en: {
                title: "GraphiX - Mathematical Visualizer",
                theme: "🌓 Theme",
                origin: "⟲ Origin",
                export: "📷 Export",
                addEquation: "Add Equation",
                add: "Add",
                pointsTable: "Points Table",
                pointsInstructions: "Add points manually or import a .csv file (two columns: x,y, no headers).",
                addPoint: "Add Point",
                importCsv: "Import CSV",
                activeEquations: "Active Equations",
                tools: "Tools",
                toolDistance: "Measure Distance",
                toolAngle: "Measure Angle",
                toolClear: "Clear Measurements",
                position: "Position",
                zoom: "Zoom",
                distanceResult: "Distance",
                angleResult: "Angle",
                toolPromptDist: "Click on 2 points",
                toolPromptAngle: "Click on 3 points",
                errorSyntaxIncomplete: (expr) => `Syntax error: The expression '${expr}' is incomplete.`,
                errorInvalidExpression: (expr) => `Error: The expression '${expr}' is not valid.`,
                errorCsvRows: (row) => `Error processing CSV: Row ${row} does not have 2 columns.`,
                errorCsvValues: (row) => `Error processing CSV: Row ${row} contains non-numeric values.`
            }
        };
        
        this.init();
    }
    
    init() {
        const savedLang = localStorage.getItem('graphix-lang') || 'es';
        this.setLanguage(savedLang);
        this.setupCanvas();
        this.setupEventListeners();
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        document.documentElement.lang = lang;
        localStorage.setItem('graphix-lang', lang);

        const t = this.translations[lang];
        document.title = t.title;

        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.dataset.langKey;
            if (t[key]) {
                el.textContent = t[key];
            }
        });

        document.getElementById('equationInput').placeholder = lang === 'es' ? "ej: x^2, sin(x), log(x)" : "e.g., x^2, sin(x), log(x)";
        document.getElementById('tool-distance').title = t.toolDistance;
        document.getElementById('tool-angle').title = t.toolAngle;
        document.getElementById('tool-clear').title = t.toolClear;

        this.updateInfo();
        this.updateToolDisplay();
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            if (container) {
                this.canvas.width = container.clientWidth;
                this.canvas.height = container.clientHeight;
                this.draw();
            }
        };
        window.addEventListener('resize', resizeCanvas);
        setTimeout(() => {
            resizeCanvas();
            this.addEquation('sin(x)');
            this.addEquation('cos(x)');
            this.updateInfo();
        }, 0);
    }
    
    setupEventListeners() {
        document.getElementById('lang-toggle').addEventListener('click', () => {
            this.setLanguage(this.currentLanguage === 'es' ? 'en' : 'es');
        });

        document.getElementById('addEquation').addEventListener('click', () => {
            const input = document.getElementById('equationInput');
            if (input.value.trim()) this.addEquation(input.value.trim());
            input.value = '';
        });
        
        document.getElementById('equationInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('addEquation').click();
        });
        
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            this.updateEquationsList();
            this.draw();
        });
        
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(1.25));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(0.8));
        
        document.getElementById('resetView').addEventListener('click', () => {
            this.scale = 50; this.offsetX = 0; this.offsetY = 0;
            this.draw();
            this.updateInfo();
        });
        
        document.getElementById('exportImage').addEventListener('click', () => {
            const canvasContainer = document.querySelector('.canvas-container');
            const backgroundColor = getComputedStyle(canvasContainer).backgroundColor;
            this.draw({ isExport: true, backgroundColor: backgroundColor });
            const link = document.createElement('a');
            link.download = 'graphix-export.png';
            link.href = this.canvas.toDataURL("image/png");
            link.click();
            this.draw();
        });

        document.getElementById('equation-section-header').addEventListener('click', (e) => this.toggleSection(e.currentTarget));
        document.getElementById('points-section-header').addEventListener('click', (e) => this.toggleSection(e.currentTarget));

        document.getElementById('add-point-btn').addEventListener('click', () => {
            this.points.push({ id: Date.now(), x: 0, y: 0 });
            this.updatePointsTable();
            this.draw();
        });

        document.getElementById('csv-upload').addEventListener('change', (e) => this.handleCsvUpload(e));
        document.getElementById('points-table-body').addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT') {
                const id = parseInt(e.target.dataset.id, 10);
                const axis = e.target.dataset.axis;
                const value = parseFloat(e.target.value);
                const point = this.points.find(p => p.id === id);
                if (point && !isNaN(value)) {
                    point[axis] = value;
                    this.draw();
                }
            }
        });
        document.getElementById('points-table-body').addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                const id = parseInt(e.target.dataset.id, 10);
                this.points = this.points.filter(p => p.id !== id);
                this.updatePointsTable();
                this.draw();
            }
        });

        const list = document.getElementById('equationsList');
        list.addEventListener('click', (e) => {
            const target = e.target;
            const id = parseInt(target.dataset.id, 10);

            if (target.classList.contains('remove-btn')) this.removeEquation(id);
            else if (target.classList.contains('color-indicator')) this.changeEquationColor(target, id);
            else if (target.classList.contains('equation-text')) this.enterEditMode(target, id);
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.currentTool) {
                this.handleToolClick(e);
            } else {
                this.isDragging = true; this.lastMousePos = { x: e.clientX, y: e.clientY };
                this.canvas.style.cursor = 'grabbing';
            }
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const dx = e.clientX - this.lastMousePos.x, dy = e.clientY - this.lastMousePos.y;
                this.offsetX += dx; this.offsetY += dy;
                this.lastMousePos = { x: e.clientX, y: e.clientY };
                this.draw();
            } else if (this.currentTool && this.tempPoints.length > 0) {
                this.draw();
            }
            this.updateInfo(e);
        });
        
        this.canvas.addEventListener('mouseup', () => { this.isDragging = false; this.canvas.style.cursor = this.currentTool ? 'crosshair' : 'move'; });
        this.canvas.addEventListener('mouseleave', () => { this.isDragging = false; this.canvas.style.cursor = this.currentTool ? 'crosshair' : 'move'; });
        this.canvas.addEventListener('wheel', (e) => { e.preventDefault(); const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1; const rect = this.canvas.getBoundingClientRect(); this.zoom(scaleFactor, e.clientX - rect.left, e.clientY - rect.top); });
        this.canvas.addEventListener('dblclick', () => document.getElementById('resetView').click());

        const toolButtons = ['distance', 'angle'];
        toolButtons.forEach(tool => {
            document.getElementById(`tool-${tool}`).addEventListener('click', () => this.setActiveTool(tool));
        });
        document.getElementById('tool-clear').addEventListener('click', () => {
            this.measurements = [];
            this.setActiveTool(null);
            this.draw();
        });
    }
    
    toggleSection(headerElement) {
        const content = headerElement.nextElementSibling;
        const arrow = headerElement.querySelector('.toggle-arrow');
        content.classList.toggle('collapsed');
        if (arrow) {
            arrow.style.transform = content.classList.contains('collapsed') ? 'rotate(0deg)' : 'rotate(180deg)';
        }
    }

    setActiveTool(tool) {
        this.currentTool = this.currentTool === tool ? null : tool;
        this.tempPoints = [];
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        if (this.currentTool) {
            document.getElementById(`tool-${this.currentTool}`).classList.add('active');
            this.canvas.classList.add('tool-active');
        } else {
            this.canvas.classList.remove('tool-active');
        }
        this.updateToolDisplay();
        this.draw();
    }

    updateToolDisplay(text) {
        const display = document.getElementById('tool-result-display');
        const t = this.translations[this.currentLanguage];
        if (text) {
            display.innerHTML = text;
            return;
        }
        switch(this.currentTool) {
            case 'distance': display.textContent = t.toolPromptDist; break;
            case 'angle': display.textContent = t.toolPromptAngle; break;
            default: display.textContent = t.tools;
        }
    }
    
    handleToolClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const graphX = (x - (this.canvas.width / 2 + this.offsetX)) / this.scale;
        const graphY = - (y - (this.canvas.height / 2 + this.offsetY)) / this.scale;
        this.tempPoints.push({x: graphX, y: graphY});
        const t = this.translations[this.currentLanguage];

        switch(this.currentTool) {
            case 'distance':
                if (this.tempPoints.length === 2) {
                    const [p1, p2] = this.tempPoints;
                    const dist = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                    this.measurements.push({ type: 'distance', points: [...this.tempPoints], result: dist.toFixed(2) });
                    this.updateToolDisplay(`${t.distanceResult}: ${dist.toFixed(2)}`);
                    this.tempPoints = [];
                }
                break;
            case 'angle':
                if (this.tempPoints.length === 3) {
                    const [p1, p2, p3] = this.tempPoints;
                    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
                    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
                    const dotProduct = v1.x * v2.x + v1.y * v2.y;
                    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
                    const angleRad = Math.acos(dotProduct / (mag1 * mag2));
                    const angleDeg = angleRad * 180 / Math.PI;
                    this.measurements.push({ type: 'angle', points: [...this.tempPoints], result: `${angleDeg.toFixed(1)}°` });
                    this.updateToolDisplay(`${t.angleResult}: ${angleDeg.toFixed(1)}°`);
                    this.tempPoints = [];
                }
                break;
        }
        this.draw();
    }

    zoom(factor, mouseX, mouseY) {
        if (mouseX === undefined) mouseX = this.canvas.width / 2;
        if (mouseY === undefined) mouseY = this.canvas.height / 2;
        const originX_before = this.canvas.width / 2 + this.offsetX;
        const originY_before = this.canvas.height / 2 + this.offsetY;
        const graphX = (mouseX - originX_before) / this.scale;
        const graphY = (mouseY - originY_before) / this.scale;
        this.scale *= factor;
        const new_originX = mouseX - graphX * this.scale;
        const new_originY = mouseY - graphY * this.scale;
        this.offsetX = new_originX - this.canvas.width / 2;
        this.offsetY = new_originY - this.canvas.height / 2;
        this.draw();
        this.updateInfo();
    }
    
    addEquation(expression) {
        const trimmedExpression = expression.trim();
        if (!this.validateExpression(trimmedExpression)) return;
        const func = this.parser.parse(trimmedExpression);
        const color = this.getFunctionColor(this.colorIndex++);
        const equation = { id: Date.now(), expression: trimmedExpression, func, color };
        this.equations.push(equation);
        this.updateEquationsList();
        this.draw();
    }
    
    removeEquation(id) {
        this.equations = this.equations.filter(eq => eq.id !== id);
        this.updateEquationsList();
        this.draw();
    }
    
    updateEquationsList() {
        const list = document.getElementById('equationsList');
        list.innerHTML = '';
        this.equations.forEach(eq => {
            const item = document.createElement('div');
            item.className = 'equation-item';
            item.innerHTML = `
                <div class="color-indicator" data-id="${eq.id}" style="background-color: ${eq.color}"></div>
                <div class="equation-text" data-id="${eq.id}">y = ${eq.expression}</div>
                <button class="remove-btn" data-id="${eq.id}">✕</button>
            `;
            list.appendChild(item);
        });
    }
    
    getFunctionColor(index) {
        const style = getComputedStyle(document.body);
        return style.getPropertyValue(`--fn-color-${(index % 6) + 1}`).trim();
    }

    changeEquationColor(indicator, id) {
        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = this.equations.find(eq => eq.id === id).color;
        colorPicker.addEventListener('input', (e) => {
            const newColor = e.target.value;
            const eq = this.equations.find(eq => eq.id === id);
            if (eq) {
                eq.color = newColor;
                indicator.style.backgroundColor = newColor;
                this.draw();
            }
        });
        colorPicker.click();
    }

    enterEditMode(textElement, id) {
        const eq = this.equations.find(eq => eq.id === id);
        if (!eq) return;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'equation-text-edit';
        input.value = eq.expression;
        textElement.replaceWith(input);
        input.focus();
        const saveChanges = () => {
            const newExpression = input.value.trim();
            if (newExpression === eq.expression) {
                input.replaceWith(textElement);
                return;
            }
            if (this.validateExpression(newExpression)) {
                eq.expression = newExpression;
                eq.func = this.parser.parse(newExpression);
                this.updateEquationsList();
                this.draw();
            } else {
                input.replaceWith(textElement);
            }
        };
        input.addEventListener('blur', saveChanges);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') input.replaceWith(textElement);
        });
    }

    validateExpression(expression) {
        const t = this.translations[this.currentLanguage];
        if (/[\+\-\*\/\^\(]$/.test(expression)) {
            alert(t.errorSyntaxIncomplete(expression));
            return false;
        }
        try {
            const func = this.parser.parse(expression);
            const testValues = [1, 2, 0.5, -1, -2, 0];
            if (!testValues.some(v => isFinite(func(v)))) {
                throw new Error("La función no produce valores graficables.");
            }
        } catch (e) {
            alert(t.errorInvalidExpression(expression));
            return false;
        }
        return true;
    }

    handleCsvUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const newPoints = [];
            const rows = text.split('\n').filter(row => row.trim() !== '');
            const t = this.translations[this.currentLanguage];
            try {
                rows.forEach((row, index) => {
                    const columns = row.split(',');
                    if (columns.length !== 2) throw new Error(t.errorCsvRows(index + 1));
                    const x = parseFloat(columns[0]);
                    const y = parseFloat(columns[1]);
                    if (isNaN(x) || isNaN(y)) throw new Error(t.errorCsvValues(index + 1));
                    newPoints.push({ id: Date.now() + index, x, y });
                });
                this.points = newPoints;
                this.updatePointsTable();
                this.draw();
            } catch (error) {
                alert(error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    updatePointsTable() {
        const tbody = document.getElementById('points-table-body');
        tbody.innerHTML = '';
        this.points.forEach(point => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="number" value="${point.x}" data-id="${point.id}" data-axis="x"></td>
                <td><input type="number" value="${point.y}" data-id="${point.id}" data-axis="y"></td>
                <td><button class="remove-btn" data-id="${point.id}">✕</button></td>
            `;
            tbody.appendChild(row);
        });
    }

    _drawContent(options = {}) {
        const width = this.canvas.width, height = this.canvas.height;
        const centerX = this.canvas.width / 2 + this.offsetX;
        const centerY = this.canvas.height / 2 + this.offsetY;
        const computedStyles = getComputedStyle(document.body);
        this.ctx.clearRect(0, 0, width, height);
        if (options.isExport && options.backgroundColor) {
            this.ctx.fillStyle = options.backgroundColor;
            this.ctx.fillRect(0, 0, width, height);
        }
        this.drawWatermark(computedStyles);
        this.drawGridAndAxes(centerX, centerY, computedStyles);
        this.equations.forEach(eq => this.drawFunction(eq.func, eq.color, centerX, centerY));
        this.drawPoints(centerX, centerY, computedStyles);
        this.drawMeasurements(centerX, centerY, computedStyles);
    }

    draw(options = {}) {
        if (options.isExport) {
            this._drawContent(options);
        } else {
            requestAnimationFrame(() => this._drawContent(options));
        }
    }
    
    drawWatermark(computedStyles) {
        const width = this.canvas.width, height = this.canvas.height;
        this.ctx.save();
        this.ctx.globalAlpha = 0.10;
        this.ctx.font = 'bold 60px -apple-system, sans-serif';
        this.ctx.fillStyle = computedStyles.getPropertyValue('--text-secondary');
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GraphiX', width / 2, height / 2);
        this.ctx.restore();
    }

    drawGridAndAxes(centerX, centerY, computedStyles) {
        const width = this.canvas.width, height = this.canvas.height;
        const gridColor = computedStyles.getPropertyValue('--grid-color');
        const gridColorMinor = computedStyles.getPropertyValue('--grid-color-minor');
        const axisColor = computedStyles.getPropertyValue('--axis-color');
        const textColor = computedStyles.getPropertyValue('--text-primary');

        const getStepSize = (scale) => {
            const desiredPixelsPerStep = 80;
            const unitsPerPixel = 1 / scale;
            const roughStep = desiredPixelsPerStep * unitsPerPixel;
            const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
            const magnitude = roughStep / power;
            if (magnitude < 1.5) return power;
            if (magnitude < 3) return 2 * power;
            if (magnitude < 7) return 5 * power;
            return 10 * power;
        };

        const step = getStepSize(this.scale);
        const subStep = step / 5;

        this.ctx.lineWidth = 0.5;
        this.ctx.strokeStyle = gridColorMinor;
        const startXMinor = Math.floor((-centerX / this.scale) / subStep) * subStep;
        const endXMinor = Math.ceil((width - centerX) / this.scale / subStep) * subStep;
        for (let x = startXMinor; x <= endXMinor; x += subStep) {
            const px = centerX + x * this.scale;
            this.ctx.beginPath(); this.ctx.moveTo(px, 0); this.ctx.lineTo(px, height); this.ctx.stroke();
        }
        const startYMinor = Math.floor((-centerY / this.scale) / subStep) * subStep;
        const endYMinor = Math.ceil((height - centerY) / this.scale / subStep) * subStep;
        for (let y = startYMinor; y <= endYMinor; y += subStep) {
            const py = centerY + y * this.scale;
            this.ctx.beginPath(); this.ctx.moveTo(0, py); this.ctx.lineTo(width, py); this.ctx.stroke();
        }

        this.ctx.lineWidth = 1;
        this.ctx.strokeStyle = gridColor;
        this.ctx.font = '12px -apple-system, sans-serif';
        this.ctx.fillStyle = textColor;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const startX = Math.floor((-centerX / this.scale) / step) * step;
        const endX = Math.ceil((width - centerX) / this.scale / step) * step;
        for (let x = startX; x <= endX; x += step) {
            const px = centerX + x * this.scale;
            this.ctx.beginPath(); this.ctx.moveTo(px, 0); this.ctx.lineTo(px, height); this.ctx.stroke();
            if (Math.abs(x) > step / 1000) this.ctx.fillText(x.toPrecision(3).replace(/\.0+$/, ''), px, centerY + 15);
        }
        const startY = Math.floor((-centerY / this.scale) / step) * step;
        const endY = Math.ceil((height - centerY) / this.scale / step) * step;
        for (let y = startY; y <= endY; y += step) {
            const py = centerY + y * this.scale;
            this.ctx.beginPath(); this.ctx.moveTo(0, py); this.ctx.lineTo(width, py); this.ctx.stroke();
            if (Math.abs(y) > step / 1000) this.ctx.fillText((-y).toPrecision(3).replace(/\.0+$/, ''), centerX - 25, py);
        }

        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = axisColor;
        this.ctx.beginPath(); this.ctx.moveTo(0, centerY); this.ctx.lineTo(width, centerY); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(centerX, 0); this.ctx.lineTo(centerX, height); this.ctx.stroke();
        this.ctx.fillText('0', centerX - 10, centerY + 15);
    }
    
    drawFunction(func, color, centerX, centerY) {
        const width = this.canvas.width;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        let firstPoint = true;
        for (let px = 0; px < width; px++) {
            const x = (px - centerX) / this.scale;
            const y = func(x);
            if (!isNaN(y) && isFinite(y)) {
                const py = centerY - y * this.scale;
                const lastX = (px - 1 - centerX) / this.scale;
                const lastY = func(lastX);
                const yDiff = Math.abs(y - lastY);
                if (firstPoint || yDiff > this.canvas.height / this.scale * 2) {
                    this.ctx.moveTo(px, py);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(px, py);
                }
            } else {
                firstPoint = true;
            }
        }
        this.ctx.stroke();
    }

    drawPoints(centerX, centerY, computedStyles) {
        const pointColor = computedStyles.getPropertyValue('--accent-color');
        this.ctx.fillStyle = pointColor;
        const pointRadius = 4;
        this.points.forEach(point => {
            const px = centerX + point.x * this.scale;
            const py = centerY - point.y * this.scale;
            this.ctx.beginPath();
            this.ctx.arc(px, py, pointRadius, 0, 2 * Math.PI);
            this.ctx.fill();
        });
    }

    drawMeasurements(centerX, centerY, computedStyles) {
        const color = computedStyles.getPropertyValue('--accent-color');
        const bgColor = computedStyles.getPropertyValue('--bg-primary');
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.font = '14px -apple-system, sans-serif';

        const toCanvas = (p) => ({ x: centerX + p.x * this.scale, y: centerY - p.y * this.scale });

        const drawTextWithBackground = (text, x, y) => {
            const textMetrics = this.ctx.measureText(text);
            const padding = 4;
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(x - textMetrics.width / 2 - padding, y - 10 - padding, textMetrics.width + 2 * padding, 20 + 2 * padding);
            this.ctx.fillStyle = color;
            this.ctx.fillText(text, x, y);
        };

        this.measurements.forEach(m => {
            const screenPoints = m.points.map(toCanvas);
            this.ctx.beginPath();
            screenPoints.forEach((p, i) => i === 0 ? this.ctx.moveTo(p.x, p.y) : this.ctx.lineTo(p.x, p.y));
            this.ctx.stroke();
            screenPoints.forEach(p => { this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI); this.ctx.fill(); });

            if (m.type === 'distance') {
                const midX = (screenPoints[0].x + screenPoints[1].x) / 2;
                const midY = (screenPoints[0].y + screenPoints[1].y) / 2;
                drawTextWithBackground(m.result, midX, midY - 15);
            } else if (m.type === 'angle') {
                drawTextWithBackground(m.result, screenPoints[1].x + 15, screenPoints[1].y - 15);
            }
        });

        if (this.tempPoints.length > 0) {
            const tempScreenPoints = this.tempPoints.map(toCanvas);
            this.ctx.beginPath();
            tempScreenPoints.forEach((p, i) => i === 0 ? this.ctx.moveTo(p.x, p.y) : this.ctx.lineTo(p.x, p.y));
            this.ctx.stroke();
            tempScreenPoints.forEach(p => { this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI); this.ctx.fill(); });
        }
    }
    
    updateInfo(mouseEvent) {
        const t = this.translations[this.currentLanguage];
        const info = document.getElementById('infoPanel');
        let text = '';
        if (mouseEvent) {
            const rect = this.canvas.getBoundingClientRect();
            const originX = this.canvas.width / 2 + this.offsetX;
            const originY = this.canvas.height / 2 + this.offsetY;
            const x = ((mouseEvent.clientX - rect.left - originX) / this.scale).toFixed(2);
            const y = (-(mouseEvent.clientY - rect.top - originY) / this.scale).toFixed(2);
            text = `${t.position}: (${x}, ${y}) | `;
        }
        text += `${t.zoom}: ${(this.scale / 50).toFixed(1)}x`;
        info.textContent = text;
    }
}

let graphix;
document.addEventListener('DOMContentLoaded', () => {
    graphix = new GraphiX();
});
