const baseData = { elec: 6000, aigua: 135000, oficina: 215, neteja: 620 };
const costs = { elec: 0.20, aigua: 0.0025, oficina: 1, neteja: 1 };
const estacionalitat = {
    elec: [1.3, 1.3, 1.1, 1.0, 0.9, 0.9, 0.8, 0.8, 0.9, 1.0, 1.2, 1.3],
    aigua:[0.9, 0.9, 1.0, 1.0, 1.1, 1.2, 1.2, 0.8, 1.1, 1.0, 0.9, 0.9],
    oficina:[1.2, 1.0, 1.0, 1.0, 1.1, 1.3, 0.2, 0.1, 1.5, 1.1, 1.0, 0.8],
    neteja: [1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 0.5, 0.5, 1.2, 1.0, 1.0, 1.0]
};

let chartInstance = null;
let estatTemps = { rawBase: { elec: 0, aigua: 0, oficina: 0, neteja: 0 }, factorGrafic: 1, titol: "" };

window.onload = () => {
    inicialitzarGrafic();
    calcularTemps('any');
};

function obrirPestanya(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

function calcularTemps(mode) {
    let raw = { elec: 0, aigua: 0, oficina: 0, neteja: 0 };
    let factor = 1;
    let titol = "";

    // Calculamos la suma total de la estacionalidad anual para que las mates cuadren siempre
    let sumEst = {
        elec: estacionalitat.elec.reduce((a,b)=>a+b,0),
        aigua: estacionalitat.aigua.reduce((a,b)=>a+b,0),
        oficina: estacionalitat.oficina.reduce((a,b)=>a+b,0),
        neteja: estacionalitat.neteja.reduce((a,b)=>a+b,0)
    };

    if (mode === 'any') {
        titol = "Full Year (12 months)";
        Object.keys(raw).forEach(k => { raw[k] = baseData[k] * sumEst[k]; });
    } else if (mode === 'curs') {
        titol = "School Year (Sep-Jun)";
        let mesos = [8,9,10,11,0,1,2,3,4,5];
        Object.keys(raw).forEach(k => { 
            let sumCurs = 0; mesos.forEach(m => sumCurs += estacionalitat[k][m]);
            raw[k] = baseData[k] * sumCurs; 
        });
    } else if (mode === 'proj1') {
        titol = "Projection +1 Year";
        Object.keys(raw).forEach(k => { raw[k] = baseData[k] * sumEst[k]; });
    } else if (mode === 'proj3') {
        titol = "Projection +3 Years";
        factor = 3;
        Object.keys(raw).forEach(k => { raw[k] = baseData[k] * sumEst[k] * 3; });
    } else if (mode === 'custom') {
        let d1 = new Date(document.getElementById('data-inici').value);
        let d2 = new Date(document.getElementById('data-fi').value);
        let dies = (d2 - d1) / 86400000;
        if(dies < 0) { alert("Invalid date"); return; }
        factor = dies / 365;
        titol = `Custom Range (${(dies/30).toFixed(1)} months)`;
        // AHORA ESTÁ ARREGLADO: Usa la misma base exacta que el +1 Año multiplicada por el factor de tiempo
        Object.keys(raw).forEach(k => { raw[k] = baseData[k] * sumEst[k] * factor; });
    }

    estatTemps = { rawBase: raw, factorGrafic: factor, titol: titol };
    actualitzarSimulacio();
}

function actualitzarSimulacio() {
    let mult = { elec: 1, aigua: 1, oficina: 1, neteja: 1 };
    
    // Leer valores de los 4 Sliders principales
    let pLed = document.getElementById('sl-led').value; document.getElementById('val-led').innerText = pLed;
    let pSolar = document.getElementById('sl-solar').value; document.getElementById('val-solar').innerText = pSolar;
    let pPluja = document.getElementById('sl-pluja').value; document.getElementById('val-pluja').innerText = pPluja;
    let pMoodle = document.getElementById('sl-moodle').value; document.getElementById('val-moodle').innerText = pMoodle;
    let pAsseca = document.getElementById('sl-asseca').value; document.getElementById('val-asseca').innerText = pAsseca;

    // 1. Multiplicadores Electricidad (4 medidas)
    mult.elec *= 1 - (pLed * 0.002) - (pSolar * 0.01);
    if(document.getElementById('chk-elec-pc').checked) mult.elec *= 0.85;
    if(document.getElementById('chk-elec-clima').checked) mult.elec *= 0.90;
    
    // 2. Multiplicadores Agua (4 medidas)
    mult.aigua *= 1 - (pPluja * 0.01);
    if(document.getElementById('chk-aigua-aire').checked) mult.aigua *= 0.85;
    if(document.getElementById('chk-aigua-wc').checked) mult.aigua *= 0.90;
    if(document.getElementById('chk-aigua-fuites').checked) mult.aigua *= 0.80;

    // 3. Multiplicadores Oficina (4 medidas)
    mult.oficina *= 1 - (pMoodle * 0.005);
    if(document.getElementById('chk-ofi-reciclat').checked) mult.oficina *= 0.90;
    if(document.getElementById('chk-ofi-bn').checked) mult.oficina *= 0.85;
    if(document.getElementById('chk-ofi-signatures').checked) mult.oficina *= 0.95;

    // 4. Multiplicadores Limpieza (4 medidas)
    mult.neteja *= 1 - (pAsseca * 0.002);
    if(document.getElementById('chk-net-granel').checked) mult.neteja *= 0.90;
    if(document.getElementById('chk-net-eco').checked) mult.neteja *= 0.85;
    if(document.getElementById('chk-net-rutes').checked) mult.neteja *= 0.80;

    // Calcular coste en Euros aplicando multiplicadores
    let res = {
        elec: estatTemps.rawBase.elec * costs.elec * mult.elec,
        aigua: estatTemps.rawBase.aigua * costs.aigua * mult.aigua,
        oficina: estatTemps.rawBase.oficina * costs.oficina * mult.oficina,
        neteja: estatTemps.rawBase.neteja * costs.neteja * mult.neteja
    };

    // Actualizar Textos en el HTML
    document.getElementById('titol-resultats').innerText = estatTemps.titol;
    document.getElementById('res-elec').innerText = Math.round(res.elec).toLocaleString();
    document.getElementById('res-aigua').innerText = Math.round(res.aigua).toLocaleString();
    document.getElementById('res-oficina').innerText = Math.round(res.oficina).toLocaleString();
    document.getElementById('res-neteja').innerText = Math.round(res.neteja).toLocaleString();

    // Calculo real de porcentaje de ahorro sumando todos los factores
    let factorGlobal = (mult.elec + mult.aigua + mult.oficina + mult.neteja) / 4;
    let estalvi = Math.round((1 - factorGlobal) * 100);
    document.getElementById('res-estalvi').innerText = `-${estalvi}%`;

    // Actualizar gráfico con 4 líneas
    if(chartInstance) {
        chartInstance.data.datasets[0].data = estacionalitat.elec.map(v => v * baseData.elec * costs.elec * mult.elec * estatTemps.factorGrafic);
        chartInstance.data.datasets[1].data = estacionalitat.aigua.map(v => v * baseData.aigua * costs.aigua * mult.aigua * estatTemps.factorGrafic);
        chartInstance.data.datasets[2].data = estacionalitat.oficina.map(v => v * baseData.oficina * costs.oficina * mult.oficina * estatTemps.factorGrafic);
        chartInstance.data.datasets[3].data = estacionalitat.neteja.map(v => v * baseData.neteja * costs.neteja * mult.neteja * estatTemps.factorGrafic);
        chartInstance.update();
    }
}

function inicialitzarGrafic() {
    const ctx = document.getElementById('historicalChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                { label: 'Electricity', data: [], borderColor: '#eab308', tension: 0.5, fill: false },
                { label: 'Water', data: [], borderColor: '#0ea5e9', tension: 0.5, fill: false },
                { label: 'Office Supplies', data: [], borderColor: '#ea580c', tension: 0.5, fill: false },
                { label: 'Cleaning', data: [], borderColor: '#0d9488', tension: 0.5, fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
