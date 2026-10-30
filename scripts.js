// Función principal del método de Brent
function brentMethod(f, xb, options = {}) {
    // Configuración de parámetros
    const xtol = options.xtol || 1e-10;
    const ytol = options.ytol || 1e-8;
    const tol = options.tol; // opcional, tolerancia unificada absoluta
    const rtol = options.rtol; // opcional, tolerancia relativa en x
    const maxIter = options.maxIter || 100;

    // Inicialización de variables
    let [a, b] = xb;
    let fa = f(a);
    let fb = f(b);

    // Verificar cambio de signo
    if (fa * fb >= 0) {
        throw new Error("No hay cambio de signo en el intervalo. El método de Brent requiere que f(a) y f(b) tengan signos opuestos.");
    }

    // Asegurar que |f(b)| <= |f(a)|
    if (Math.abs(fa) < Math.abs(fb)) {
        [a, b] = [b, a];
        [fa, fb] = [fb, fa];
    }

	let c = a;
	let fc = fa;
	let d = c;
	let mflag = true;
	let s = 0;
	let fs = 0;
	let iter = 0;
	let history = [];
	let errors = [];

    while (iter < maxIter) {
        iter++;

        // Tolerancia efectiva en x combinando xtol, tol y rtol
        const effectiveXtol = Math.max(
            xtol || 0,
            (typeof tol === 'number' && !isNaN(tol)) ? tol : 0,
            (typeof rtol === 'number' && !isNaN(rtol)) ? (rtol * Math.abs(b)) : 0
        );

        // Condición de parada principal (intervalo o valor de la función)
        if (Math.abs(b - a) < effectiveXtol || Math.abs(fb) <= ytol) {
            return {
                root: b,
                value: fb,
                iterations: iter,
				history: history,
				errors: errors,
                converged: true
            };
        }

		// Tomar una instantánea del intervalo antes de actualizar
		const aBefore = a;
		const bBefore = b;
		const cBefore = c;
		const faBefore = fa;
		const fbBefore = fb;
		const fcBefore = fc;
		let methodUsed = 'Secante';

		// Selección del método de interpolación
		if (fa !== fc && fb !== fc) {
			// Interpolación cuadrática inversa
			s = (a * fb * fc) / ((fa - fb) * (fa - fc)) +
				(b * fa * fc) / ((fb - fa) * (fb - fc)) +
				(c * fa * fb) / ((fc - fa) * (fc - fb));
			methodUsed = 'ICI';
		} else {
			// Método de la secante (propuesta)
			// Proteger contra división por cero
			if (fb === fa) {
				s = (a + b) / 2;
				methodUsed = 'Bisección';
			} else {
				s = b - fb * (b - a) / (fb - fa);
				methodUsed = 'Secante';
			}
		}

        // Condiciones para usar bisección
        const condition1 = (s < (3*a + b)/4) || (s > b);                        //(FUERA DE RANGO) prediciion si da un numero fuera de rango
        const condition2 = mflag && (Math.abs(s - b) >= Math.abs(b - c)/2);     //(CONTROL DE VELOCIDAD) si la funcion va lenta cambia a biseccion
        const condition3 = !mflag && (Math.abs(s - b) >= Math.abs(c - d)/2);    //(SI EL ANTERIOR FUE INTERPOLACION) si la convergencia empieza a relentizarse
        const condition4 = mflag && (Math.abs(b - c) < effectiveXtol);    //el freno cuando el intervalo se vuelve muy pequeno
        const condition5 = !mflag && (Math.abs(c - d) < effectiveXtol);

		if (condition1 || condition2 || condition3 || condition4 || condition5) {
			s = (a + b) / 2;
			mflag = true;
			methodUsed = 'Bisección';
		} else {
			mflag = false;
		}

        fs = f(s);
        d = c;
        c = b;
        fc = fb;

		// Registrar historia de esta iteración (antes de actualizar intervalo)
		const errorInterval = Math.abs(bBefore - aBefore);
		const errorFx = Math.abs(fbBefore);
		history.push({
			iteration: iter,
			a: aBefore,
			b: bBefore,
			c: cBefore,
			s: s,
			f_a: faBefore,
			f_b: fbBefore,
			f_c: fcBefore,
			f_s: fs,
			method: methodUsed,
			error_interval: errorInterval,
			error_fx: errorFx
		});
		errors.push({ iteration: iter, error_interval: errorInterval, error_fx: errorFx });

        if (fa * fs < 0) {
            b = s;
            fb = fs;
        } else {
            a = s;
            fa = fs;
        }

        // Asegurar que |f(b)| <= |f(a)|
        if (Math.abs(fa) < Math.abs(fb)) {
            [a, b] = [b, a];
            [fa, fb] = [fb, fa];
        }
    }

    return {
        root: b,
        value: fb,
        iterations: iter,
		history: history,
		errors: errors,
        converged: Math.abs(fb) <= ytol,
        warning: Math.abs(fb) > ytol ? "Puede haber un polo o discontinuidad, o se alcanzó el máximo de iteraciones" : null
    };
}

// Función para parsear la función ingresada por el usuario
function parseFunction(input) {
    try {
        // Reemplazar ^ con ** para exponentes
        const expr = input.replace(/\^/g, '**');

        // Crear función segura
        return new Function('x', `
            try {
                return ${expr};
            } catch (e) {
                return NaN;
            }
        `);
    } catch (e) {
        return null;
    }
}

function displayResults(result, func, a, b) {
    const outputDiv = document.getElementById('output');

    if (result.error) {
        outputDiv.innerHTML = `
            <div class="error">
                <h3>Error</h3>
                <p>${result.error}</p>
            </div>
        `;
        return;
    }



    // --- INICIO DE LA NUEVA SECCIÓN: Bitácora Explicativa ---
    let logHtml = `<h3>Detalle del Método Numérico</h3><div class="log-container">`;

    result.history.forEach(iter => {
        logHtml += `<div class="log-entry">`;

        // 1. Inicio de la Iteración
        logHtml += `<strong>Iteración ${iter.iteration}</strong>`;
        logHtml += `<ul>`;
        logHtml += `<li>Intervalo: [${iter.a.toExponential(6)}, ${iter.b.toExponential(6)}]</li>`;
        logHtml += `<li>Mejor estimación (b): ${iter.b.toExponential(6)} (f(b) = ${iter.f_b.toExponential(6)})</li>`;

        // 2. La Decisión del Método
        if (iter.method === 'Bisección') {
            logHtml += `<li><strong>Decisión:</strong> Método de Bisección (Fallback)</li>`;
            logHtml += `<li class="reason"><em>Razón: La interpolación fue insegura o demasiado lenta.</em></li>`;
        } else {
            logHtml += `<li><strong>Decisión:</strong> ${iter.method} (Interpolación)</li>`;
            logHtml += `<li class="reason"><em>Razón: La conjetura fue rápida y se mantuvo dentro del intervalo.</em></li>`;
        }

        // 3. El Cálculo del Nuevo Punto (CON FÓRMULAS)
        let formulaHtml = '';
        if (iter.method === 'Bisección') {
            formulaHtml = `
<li class="log-formula">
    <details>
        <summary>Cálculo (Bisección): <strong>s = ${iter.s.toExponential(6)}</strong></summary>
        <div class="formula-content">Fórmula: s = (a + b) / 2
Cálculo: s = (${iter.a.toPrecision(7)} + ${iter.b.toPrecision(7)}) / 2
Resultado: s = ${iter.s.toExponential(6)}</div>
    </details>
</li>`;
        } else if (iter.method === 'Secante') {
            formulaHtml = `
<li class="log-formula">
    <details>
        <summary>Cálculo (Secante): <strong>s = ${iter.s.toExponential(6)}</strong></summary>
        <div class="formula-content">Fórmula: s = b - f(b) * (b - a) / (f(b) - f(a))
(Cálculo numérico omitido por brevedad)
Resultado: s = ${iter.s.toExponential(6)}</div>
    </details>
</li>`;
        } else if (iter.method === 'ICI') {
            formulaHtml = `
<li class="log-formula">
    <details>
        <summary>Cálculo (ICI): <strong>s = ${iter.s.toExponential(6)}</strong></summary>
        <div class="formula-content">Fórmula: Interpolación Cuadrática Inversa (usando a, b, c)
(Fórmula omitida por su gran longitud)
Resultado: s = ${iter.s.toExponential(6)}</div>
    </details>
</li>`;
        }
        logHtml += formulaHtml; // Añade el bloque de fórmula

        // 4. La Evaluación (CON FÓRMULA)
        logHtml += `
<li class="log-formula">
    <details>
        <summary>Evaluación: <strong>f(s) = ${iter.f_s.toExponential(6)}</strong></summary>
        <div class="formula-content">Fórmula: f(s)
Cálculo: f(${iter.s.toExponential(6)})
Resultado: f(s) = ${iter.f_s.toExponential(6)}</div>
    </details>
</li>`;

        // 5. La Actualización del Intervalo (CON EVIDENCIA)
        const check = iter.f_a * iter.f_s;
        const condition = check < 0;

        logHtml += `
<li class="log-formula">
    <details>
        <summary>Comprobación de Signo</summary>
        <div class="formula-content">Comprobando:  f(a) * f(s) < 0
Cálculo:  (${iter.f_a.toExponential(3)}) * (${iter.f_s.toExponential(3)}) < 0
Resultado:  ${check.toExponential(3)} < 0 = <strong>${condition ? 'VERDADERO' : 'FALSO'}</strong></div>
    </details>
</li>`;

        if (condition) {
            logHtml += `<li><strong>Actualización:</strong> VERDADERO. El nuevo intervalo es [${iter.a.toExponential(6)}, ${iter.s.toExponential(6)}]. (s -> b)</li>`;
        } else {
            logHtml += `<li><strong>Actualización:</strong> FALSO. El nuevo intervalo es [${iter.s.toExponential(6)}, ${iter.b.toExponential(6)}]. (s -> a)</li>`;
        }

        logHtml += `</ul></div>`;
    });

    logHtml += `</div>`;
    // --- FIN DE LA NUEVA SECCIÓN ---


    // Resumen de métodos usados (Tu código original)
    const methodCounts = result.history.reduce((acc, it) => {
        const m = it.method || 'Desconocido';
        acc[m] = (acc[m] || 0) + 1;
        return acc;
    }, {});

    const methodSummaryHtml = `
        <div style="margin-top: 8px;">
            <strong>Métodos usados:</strong>
            <span style="margin-left:8px;">Bisección: ${methodCounts['Bisección'] || 0}</span>
            <span style="margin-left:8px;">Secante: ${methodCounts['Secante'] || 0}</span>
            <span style="margin-left:8px;">ICI: ${methodCounts['ICI'] || 0}</span>
        </div>
    `;

    // Generar tabla de iteraciones (Tu código original)
    let tableHtml = `
        <h3>Detalle de iteraciones (Datos)</h3>
        <div class="table-container">
            <table>
                <tr>
                    <th>Iteración</th>
                    <th>a</th>
                    <th>b</th>
                    <th>c</th>
                    <th>s</th>
                    <th>f(a)</th>
                    <th>f(b)</th>
                    <th>f(s)</th>
                    <th>Método</th>
                    <th>Error</th>
                </tr>
    `;

    result.history.forEach(iter => {
        const error = iter.error_interval ?? Math.abs(iter.b - iter.a);
        tableHtml += `
            <tr>
                <td>${iter.iteration}</td>
                <td>${iter.a.toExponential(6)}</td>
                <td>${iter.b.toExponential(6)}</td>
                <td>${(iter.c ?? NaN).toExponential ? iter.c.toExponential(6) : '-'}</td>
                <td>${(iter.s ?? NaN).toExponential ? iter.s.toExponential(6) : '-'}</td>
                <td>${iter.f_a.toExponential(6)}</td>
                <td>${iter.f_b.toExponential(6)}</td>
                <td>${(iter.f_s !== undefined ? iter.f_s.toExponential(6) : '-')}</td>
                <td>${iter.method || '-'}</td>
                <td>${error.toExponential(6)}</td>
            </tr>
        `;
    });

    tableHtml += `</table></div>`;

    // Mostrar resultados principales
    outputDiv.innerHTML = `
        <div class="${result.converged ? 'success' : 'warning'}">
            <h3>Valor calculado</h3>
            <p>Función evaluada: f(x) = ${document.getElementById('function-input').value}</p>
            <p>Intervalo de búsqueda: [${a}, ${b}]</p>
            <p>Raíz calculada: x &asymp; ${result.root.toExponential(8)}</p>
            <p>f(x) &asymp; ${result.value.toExponential(8)}</p>
            <p>Iteraciones: ${result.iterations}</p>
            ${result.warning ? `<p class="warning">Advertencia: ${result.warning}</p>` : ''}
        </div>

        ${logHtml} ${methodSummaryHtml}

        ${tableHtml} `;

    // Generar gráficos (Tu código original)
    const latest = result.history[result.history.length - 1] || null;
    generatePlot(func, a, b, result.root, latest);
    generateErrorPlot(result.errors || [], result.converged);
}



// Función para generar el gráfico
function generatePlot(func, a, b, root, latestIter) {
    // Generar puntos para el gráfico
    const step = (b - a) / 100;
    const xValues = [];
    const yValues = [];

    for (let x = a; x <= b; x += step) {
        xValues.push(x);
        yValues.push(func(x));
    }

    // Datos para la función
    const trace1 = {
        x: xValues,
        y: yValues,
        mode: 'lines',
        name: 'f(x)',
        line: {color: '#8a6d3b'}
    };

	// Datos para la raíz encontrada
    const trace2 = {
        x: [root],
        y: [0],
        mode: 'markers',
        name: 'Raíz',
        marker: {color: '#b1483f', size: 10}
    };

	// Marcadores para a, b, c y s (de la última iteración)
	const markers = [];
	if (latestIter) {
		markers.push({
			x: [latestIter.a], y: [func(latestIter.a)], mode: 'markers', name: 'a',
			marker: { color: '#c9a84c', size: 8, symbol: 'circle' }
		});
		markers.push({
			x: [latestIter.b], y: [func(latestIter.b)], mode: 'markers', name: 'b',
			marker: { color: '#4f7a5c', size: 8, symbol: 'circle' }
		});
		if (typeof latestIter.c === 'number') {
			markers.push({
				x: [latestIter.c], y: [func(latestIter.c)], mode: 'markers', name: 'c',
				marker: { color: '#6b5329', size: 8, symbol: 'diamond' }
			});
		}
		if (typeof latestIter.s === 'number') {
			markers.push({
				x: [latestIter.s], y: [func(latestIter.s)], mode: 'markers', name: 's (prueba)',
				marker: { color: '#b1483f', size: 9, symbol: 'x' }
			});
		}
	}

    // Datos para el eje x
    const trace3 = {
        x: [a, b],
        y: [0, 0],
        mode: 'lines',
        name: 'Eje x',
        line: {color: '#6b625a', dash: 'dash'}
    };

    const layout = {
        title: 'Gráfico de la función y la raíz encontrada',
        xaxis: {title: 'x'},
        yaxis: {title: 'f(x)'},
        showlegend: true,
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff',
        font: { family: 'Inter, sans-serif', color: '#2b2420' },
        margin: { t: 48 }
    };

	Plotly.newPlot('plot-container', [trace1, trace3, trace2, ...markers], layout, {responsive: true});
}

// Gráfico de error vs iteración (log10)
function generateErrorPlot(errors, converged) {
	const iterations = errors.map(e => e.iteration);
	const errInterval = errors.map(e => e.error_interval);
	const errFx = errors.map(e => e.error_fx);

	const toLog10 = v => (v > 0 ? Math.log10(v) : null);
	const y1 = errInterval.map(toLog10);
	const y2 = errFx.map(toLog10);

	const traceErr1 = { x: iterations, y: y1, mode: 'lines+markers', name: 'log10(|b-a|)', line: { color: '#8a6d3b' } };
	const traceErr2 = { x: iterations, y: y2, mode: 'lines+markers', name: 'log10(|f(b)|)', line: { color: '#4f7a5c', dash: 'dash' } };

	const layout = {
		title: 'Convergencia del error',
		xaxis: { title: 'Iteración' },
		yaxis: { title: 'log10(error)' },
		showlegend: true,
        paper_bgcolor: '#ffffff',
        plot_bgcolor: '#ffffff',
        font: { family: 'Inter, sans-serif', color: '#2b2420' },
        margin: { t: 48 }
	};

	Plotly.newPlot('error-plot-container', [traceErr1, traceErr2], layout, {responsive: true});
}

// Evento al hacer clic en el botón de calcular
document.getElementById('calculate-btn').addEventListener('click', function() {
    try {
        // Obtener valores de entrada
        const funcInput = document.getElementById('function-input').value;
        const a = parseFloat(document.getElementById('lower-bound').value);
        const b = parseFloat(document.getElementById('upper-bound').value);
        const xtol = parseFloat(document.getElementById('xtol').value);
        const ytol = parseFloat(document.getElementById('ytol').value);
        const maxIter = parseInt(document.getElementById('max-iter').value);
        const tol = parseFloat(document.getElementById('tol').value);
        const rtol = parseFloat(document.getElementById('rtol').value);

        // Validar entrada
        if (isNaN(a) || isNaN(b)) {
            throw new Error("Los límites del intervalo deben ser números válidos.");
        }

        if (a >= b) {
            throw new Error("El límite inferior debe ser menor que el límite superior.");
        }

        // Parsear función
        const f = parseFunction(funcInput);
        if (!f) {
            throw new Error("La función ingresada no es válida.");
        }

        // Verificar que la función sea evaluable en los extremos
        if (isNaN(f(a)) || isNaN(f(b))) {
            throw new Error("La función no puede evaluarse en los extremos del intervalo.");
        }

        // Validaciones adicionales
        if (!isNaN(tol) && tol < 0) {
            throw new Error("La tolerancia unificada (tol) debe ser no negativa.");
        }
        if (!isNaN(rtol) && rtol < 0) {
            throw new Error("La tolerancia relativa (rtol) debe ser no negativa.");
        }

        // Ejecutar método de Brent
        const result = brentMethod(f, [a, b], {
            xtol: xtol,
            ytol: ytol,
            tol: isNaN(tol) ? undefined : tol,
            rtol: isNaN(rtol) ? undefined : rtol,
            maxIter: maxIter
        });

        // Mostrar resultados
        displayResults(result, f, a, b);

    } catch (error) {
        document.getElementById('output').innerHTML = `
            <div class="error">
                <h3>Error</h3>
                <p>${error.message}</p>
            </div>
        `;
        // Limpiar gráfico en caso de error
        document.getElementById('plot-container').innerHTML = '';
        const errEl = document.getElementById('error-plot-container');
        if (errEl) errEl.innerHTML = '';
    }
});