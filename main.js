const baseData = { elec: 6000, aigua: 135000, oficina: 215, neteja: 620 };
const costs = { elec: 0.20, aigua: 0.0025, oficina: 1, neteja: 1 };
const estacionalitat = {
    elec: [1.3, 1.3, 1.1, 1.0, 0.9, 0.9, 0.8, 0.8, 0.9, 1.0, 1.2, 1.3],
    aigua:[0.9, 0.9, 1.0, 1.0, 1.1, 1.2, 1.2, 0.8, 1.1, 1.0, 0.9, 0.9],
    oficina:[1.2, 1.0, 1.0, 1.0, 1.1, 1.3, 0.2, 0.1, 1.5, 1.1, 1.0, 0.8],
    neteja: [1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 0.5, 0.5, 1.2, 1.0, 1.0, 1.0]
};

let modeActual = 'any';
let chartInstance = null;

window.onload = () => {
    inicialitzarGrafic();
    actualitzarSimulacio();
};

function setPeriode(mode) {
    modeActual = mode;
    document.getElementById('btn-any').classList.toggle('active', mode === 'any');
    document.getElementById('btn-curs').classList.toggle('active', mode === 'curs');
    actualitzarSimulacio();
}

function setProjeccioRapida(anys) {
    const inici = new Date(document.getElementById('data-inici').value);
    const fi = new Date(inici);
    fi.setFullYear(inici.getFullYear() + anys);
    
    document.getElementById('data-fi').value = fi.toISOString().split('T')[0];
    
    document.getElementById('btn-proj-1').classList.toggle('active', anys === 1);
    document.getElementById('btn-proj-3').classList.toggle('active', anys === 3);
    
    actualitzarSimulacio();
}

function calcularPersonalitzat() {
    document.getElementById('btn-proj-1').classList.remove('active');
    document.getElementById('btn-proj-3').classList.remove('active');
    actualitzarSimulacio();
}

function obrirPestanya(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

function actualitzarSimulacio() {
    let raw = { elec: 0, aigua: 0, oficina: 0, neteja: 0 };
    
    // 1. Càlcul Base segons període
    if (modeActual === 'any') {
        Object.keys(raw).forEach(k => {
            for(let m=0; m<12; m++) raw[k] += baseData[k] * estacionalitat[k][m];
        });
    } else {
        let mesosCurs = [8,9,10,11,0,1,2,3,4,5]; // Setembre a Juny
        Object.keys(raw).forEach(k => {
            mesosCurs.forEach(m => raw[k] += baseData[k] * estacionalitat[k][m]);
        });
    }

    // 2. Multiplicador per temps de projecció
    const d1 = new Date(document.getElementById('data-inici').value);
    const d2 = new Date(document.getElementById('data-fi').value);
    const diffTemps = d2 - d1;
    const anysProjeccio = Math.max(0, diffTemps / (1000 * 60 * 60 * 24 * 365.25));
    
    Object.keys(raw).forEach(k => raw[k] *= anysProjeccio);
    const costOriginalTotal = (raw.elec * costs.elec) + (raw.aigua * costs.aigua) + raw.oficina + raw.neteja;

    // 3. Aplicació de mesures
    let mElec = 1, mAigua = 1, mOfi = 1, mNet = 1;
    
    // Electricitat
    const pLed = document.getElementById('sl-led').value;
    document.getElementById('val-led').innerText = pLed;
    mElec *= (1 - (pLed * 0.2 / 100));
    if(document.getElementById('chk-elec-pc').checked) mElec *= 0.85;
    if(document.getElementById('chk-elec-clima').checked) mElec *= 0.90;

    // Aigua
    if(document.getElementById('chk-aigua-aire').checked) mAigua *= 0.85;
    const pPluja = document.getElementById('sl-pluja').value;
    document.getElementById('val-pluja').innerText = pPluja;
    mAigua *= (1 - (pPluja / 100));

    // Aplicar estalvis
    raw.elec *= mElec;
    raw.aigua *= mAigua;
    raw.oficina *= (1 - (document.getElementById('sl-moodle').value * 0.5 / 100));
    if(document.getElementById('chk-net-eco').checked) raw.neteja *= 0.95;

    // 4. Mostrar Resultats
    document.getElementById('res-elec').innerText = Math.round(raw.elec).toLocaleString();
    document.getElementById('res-aigua').innerText = Math.round(raw.aigua).toLocaleString();
    document.getElementById('res-oficina').innerText = Math.round(raw.oficina).toLocaleString();
    document.getElementById('res-neteja').innerText = Math.round(raw.neteja).toLocaleString();

    const costFinalTotal = (raw.elec * costs.elec) + (raw.aigua * costs.aigua) + raw.oficina + raw.neteja;
    const estalviPercent = costOriginalTotal > 0 ? ((1 - (costFinalTotal / costOriginalTotal)) * 100).toFixed(1) : 0;
    document.getElementById('res-estalvi').innerText = estalviPercent + "%";
    document.getElementById('titol-resultats').innerText = `Projecció a ${anysProjeccio.toFixed(1)} anys`;

    actualitzarGrafic(anysProjeccio, mElec, mAigua);
}

function inicialitzarGrafic() {
    const ctx = document.getElementById('historicalChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Actual', 'Projectat'],
            datasets: [{
                label: 'Cost Total (€)',
                data: [0, 0],
                borderColor: '#1e3a8a',
                backgroundColor: 'rgba(30, 58, 138, 0.1)',
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function actualitzarGrafic(anys, mElec, mAigua) {
    if(!chartInstance) return;
    const costBaseAnual = (baseData.elec * 12 * costs.elec) + (baseData.aigua * 12 * costs.aigua) + (baseData.oficina * 12) + (baseData.neteja * 12);
    const costFutur = costBaseAnual * anys * (mElec * 0.4 + mAigua * 0.6); // Simplificació per la corba
    
    chartInstance.data.datasets[0].data = [costBaseAnual, costFutur];
    chartInstance.update();
}
