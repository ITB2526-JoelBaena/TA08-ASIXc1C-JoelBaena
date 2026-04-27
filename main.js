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

    if (mode === 'any') {
        titol = "Any Complet (12 mesos)";
        Object.keys(raw).forEach(k => { for(let m=0; m<12; m++) raw[k] += baseData[k] * estacionalitat[k][m]; });
    } else if (mode === 'curs') {
        titol = "Curs Escolar (Set-Jun)";
        let mesos = [8,9,10,11,0,1,2,3,4,5];
        Object.keys(raw).forEach(k => { mesos.forEach(m => raw[k] += baseData[k] * estacionalitat[k][m]); });
    } else if (mode === 'proj1') {
        titol = "Projecció +1 Any";
        Object.keys(raw).forEach(k => { for(let m=0; m<12; m++) raw[k] += baseData[k] * estacionalitat[k][m]; });
    } else if (mode === 'proj3') {
        titol = "Projecció +3 Anys";
        factor = 3;
        Object.keys(raw).forEach(k => { for(let m=0; m<12; m++) raw[k] += baseData[k] * estacionalitat[k][m] * 3; });
    } else if (mode === 'custom') {
        let d1 = new Date(document.getElementById('data-inici').value);
        let d2 = new Date(document.getElementById('data-fi').value);
        let dies = (d2 - d1) / 86400000;
        if(dies < 0) { alert("Data no vàlida"); return; }
        factor = dies / 365;
        titol = `Tram Personalitzat (${(dies/30).toFixed(1)} mesos)`;
        Object.keys(raw).forEach(k => { raw[k] = baseData[k] * 12 * factor; });
    }

    estatTemps = { rawBase: raw, factorGrafic: factor, titol: titol };
    actualitzarSimulacio();
}

function actualitzarSimulacio() {
    let mult = { elec: 1, aigua: 1, oficina: 1, neteja: 1 };
    
    // Lectura de inputs
    let pLed = document.getElementById('sl-led').value; document.getElementById('val-led').innerText = pLed;
    let pSolar = document.getElementById('sl-solar').value; document.getElementById('val-solar').innerText = pSolar;
    let pPluja = document.getElementById('sl-pluja').value; document.getElementById('val-pluja').innerText = pPluja;
    let pMoodle = document.getElementById('sl-moodle').value; document.getElementById('val-moodle').innerText = pMoodle;
    let pAsseca = document.getElementById('sl-asseca').value; document.getElementById('val-asseca').innerText = pAsseca;

    mult.elec *= 1 - (pLed * 0.002) - (pSolar * 0.01);
    if(document.getElementById('chk-elec-pc').checked) mult.elec *= 0.85;
    if(document.getElementById('chk-elec-clima').checked) mult.elec *= 0.90;
    
    mult.aigua *= 1 - (pPluja * 0.01);
    if(document.getElementById('chk-aigua-aire').checked) mult.aigua *= 0.85;
    if(document.getElementById('chk-aigua-wc').checked) mult.aigua *= 0.90;

    mult.oficina *= 1 - (pMoodle * 0.005);
    if(document.getElementById('chk-ofi-bn').checked) mult.oficina *= 0.85;

    let res = {
        elec: estatTemps.rawBase.elec * mult.elec,
        aigua: estatTemps.rawBase.aigua * mult.aigua,
        oficina: estatTemps.rawBase.oficina * mult.oficina,
        neteja: estatTemps.rawBase.neteja * mult.neteja
    };

    document.getElementById('titol-resultats').innerText = estatTemps.titol;
    document.getElementById('res-elec').innerText = Math.round(res.elec).toLocaleString();
    document.getElementById('res-aigua').innerText = Math.round(res.aigua).toLocaleString();
    document.getElementById('res-oficina').innerText = Math.round(res.oficina).toLocaleString();
    document.getElementById('res-neteja').innerText = Math.round(res.neteja).toLocaleString();

    let estalvi = Math.floor(Math.random() * 10) + 15; // Simulat per a l'exemple
    document.getElementById('res-estalvi').innerText = `-${estalvi}%`;

    if(chartInstance) {
        chartInstance.data.datasets[0].data = estacionalitat.elec.map(v => v * baseData.elec * costs.elec * mult.elec * estatTemps.factorGrafic);
        chartInstance.data.datasets[1].data = estacionalitat.aigua.map(v => v * baseData.aigua * costs.aigua * mult.aigua * estatTemps.factorGrafic);
        chartInstance.update();
    }
}

function inicialitzarGrafic() {
    const ctx = document.getElementById('historicalChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'],
            datasets: [
                { label: 'Electricitat', data: [], borderColor: '#eab308', tension: 0.5, fill: false },
                { label: 'Aigua', data: [], borderColor: '#0ea5e9', tension: 0.5, fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
