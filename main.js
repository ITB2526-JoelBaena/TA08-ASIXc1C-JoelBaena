// 1. DADES BASE I VARIABLES
const baseData = { elec: 6000, aigua: 135000, oficina: 215, neteja: 620 };
const costs = { elec: 0.20, aigua: 0.0025, oficina: 1, neteja: 1 };
const estacionalitat = {
    elec: [1.3, 1.3, 1.1, 1.0, 0.9, 0.9, 0.8, 0.8, 0.9, 1.0, 1.2, 1.3],
    aigua:[0.9, 0.9, 1.0, 1.0, 1.1, 1.2, 1.2, 0.8, 1.1, 1.0, 0.9, 0.9],
    oficina:[1.2, 1.0, 1.0, 1.0, 1.1, 1.3, 0.2, 0.1, 1.5, 1.1, 1.0, 0.8],
    neteja: [1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 0.5, 0.5, 1.2, 1.0, 1.0, 1.0]
};

let chartInstance = null;

// Límits del calendari de projecció
const MIN_PROJ = new Date('2025-01-17');
const MAX_PROJ = new Date('2028-01-17');

// Estat global de temps (Indepedent per a cada botó)
let estatTemps = {
    rawBase: { elec: 0, aigua: 0, oficina: 0, neteja: 0 },
    factorGrafic: 1,
    titol: "Selecciona un període per començar"
};

// 2. INICIALITZACIÓ
window.onload = () => {
    inicialitzarGrafic();
    calcularTemps('any'); // Simulem clic a "Any Complet" a l'inici perquè no estigui buit
};

// 3. PESTANYES DE MESURES
function obrirPestanya(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 4. CONTROLADOR DE TEMPS (Els 5 botons independents)
function calcularTemps(mode) {
    let raw = { elec: 0, aigua: 0, oficina: 0, neteja: 0 };
    let factor = 1;
    let titol = "";

    if (mode === 'any') {
        titol = "Període Base: Any Complet (12 mesos)";
        factor = 1;
        Object.keys(raw).forEach(k => {
            for(let m=0; m<12; m++) raw[k] += baseData[k] * estacionalitat[k][m];
        });
    } 
    else if (mode === 'curs') {
        titol = "Període Base: Curs Escolar (Set-Jun)";
        factor = 1; // La gràfica es dibuixa a l'escala d'un any
        let mesos = [8,9,10,11,0,1,2,3,4,5];
        Object.keys(raw).forEach(k => {
            mesos.forEach(m => raw[k] += baseData[k] * estacionalitat[k][m]);
        });
    } 
    else if (mode === 'proj1') {
        titol = "Projecció: + 1 Any (Des del 17/01/2025)";
        factor = 1;
        Object.keys(raw).forEach(k => {
            for(let m=0; m<12; m++) raw[k] += baseData[k] * estacionalitat[k][m];
        });
    } 
    else if (mode === 'proj3') {
        titol = "Projecció: + 3 Anys (Des del 17/01/2025)";
        factor = 3;
        Object.keys(raw).forEach(k => {
            for(let m=0; m<12; m++) raw[k] += baseData[k] * estacionalitat[k][m] * factor;
        });
    } 
    else if (mode === 'custom') {
        let d1 = document.getElementById('data-inici').value;
        let d2 = document.getElementById('data-fi').value;
        
        if(!d1 || !d2) { alert("Selecciona les dues dates"); return; }
        
        let date1 = new Date(d1);
        let date2 = new Date(d2);
        
        if(date1 < MIN_PROJ || date2 > MAX_PROJ) {
            alert("Error: El calendari es limita a dades entre 17/01/2025 i 17/01/2028");
            return;
        }

        let dies = (date2 - date1) / 86400000;
        if(dies < 0) {
            alert("Error: La data inicial ha de ser anterior a la data final");
            return;
        }

        factor = dies / 365.25;
        titol = `Tram Personalitzat: Projecció a ${(dies/365.25).toFixed(1)} anys`;
        
        Object.keys(raw).forEach(k => {
            let mitjanaM = estacionalitat[k].reduce((a, b) => a + b) / 12;
            raw[k] = baseData[k] * factor * mitjanaM * 12;
        });
    }

    // Guardem l'estat temporal i actualitzem la simulació general
    estatTemps.rawBase = raw;
    estatTemps.factorGrafic = factor;
    estatTemps.titol = titol;

    actualitzarSimulacio();
}

// 5. MOTOR DE SIMULACIÓ (Aplica mesures de sostenibilitat)
function actualitzarSimulacio() {
    // Si no hi ha cap temps triat (no hauria de passar perquè forcem "any" a l'inici), no fem res.
    if(!estatTemps.titol) return; 

    // Copiem les dades pures per no sobreescriure l'estat
    let raw = { ...estatTemps.rawBase };
    let totalOriginal = (raw.elec * costs.elec) + (raw.aigua * costs.aigua) + raw.oficina + raw.neteja;

    // Lector de sliders i checkboxes
    let pLed = document.getElementById('sl-led').value; document.getElementById('val-led').innerText = pLed;
    let pSolar = document.getElementById('sl-solar').value; document.getElementById('val-solar').innerText = pSolar;
    let pPluja = document.getElementById('sl-pluja').value; document.getElementById('val-pluja').innerText = pPluja;
    let pMoodle = document.getElementById('sl-moodle').value; document.getElementById('val-moodle').innerText = pMoodle;
    let pAsseca = document.getElementById('sl-asseca').value; document.getElementById('val-asseca').innerText = pAsseca;

    let mult = { elec: 1, aigua: 1, oficina: 1, neteja: 1 };

    mult.elec *= 1 - ((pLed * 0.20) / 100); 
    mult.elec *= 1 - ((pSolar * 1) / 100); 
    if(document.getElementById('chk-elec-pc').checked) mult.elec *= 0.85;
    if(document.getElementById('chk-elec-sensors').checked) mult.elec *= 0.95;
    if(document.getElementById('chk-elec-clima').checked) mult.elec *= 0.90;
    mult.elec *= 1 + ((pAsseca * 0.05) / 100); 
    
    mult.aigua *= 1 - ((pPluja * 1) / 100); 
    if(document.getElementById('chk-aigua-aire').checked) mult.aigua *= 0.85;
    if(document.getElementById('chk-aigua-wc').checked) mult.aigua *= 0.90;
    if(document.getElementById('chk-aigua-sensors').checked) mult.aigua *= 0.90;
    if(document.getElementById('chk-aigua-fuites').checked) mult.aigua *= 0.98;

    mult.oficina *= 1 - ((pMoodle * 0.50) / 100); 
    if(document.getElementById('chk-ofi-retoladors').checked) mult.oficina *= 0.95;
    if(document.getElementById('chk-ofi-reciclat').checked) mult.oficina *= 0.90;
    if(document.getElementById('chk-ofi-bn').checked) mult.oficina *= 0.85;
    if(document.getElementById('chk-ofi-signatures').checked) mult.oficina *= 0.90;

    mult.neteja *= 1 - ((pAsseca * 0.40) / 100); 
    if(document.getElementById('chk-net-granel').checked) mult.neteja *= 0.85;
    if(document.getElementById('chk-net-eco').checked) mult.neteja *= 0.95;
    if(document.getElementById('chk-net-baietes').checked) mult.neteja *= 0.95;
    if(document.getElementById('chk-net-rutes').checked) mult.neteja *= 0.95;

    // Aplicar descomptes als totals actuals
    raw.elec *= mult.elec;
    raw.aigua *= mult.aigua;
    raw.oficina *= mult.oficina;
    raw.neteja *= mult.neteja;

    // Actualitzar Pantalla HTMl (Resultats punt 5)
    document.getElementById('titol-resultats').innerText = estatTemps.titol;
    document.getElementById('res-elec').innerText = raw.elec.toLocaleString('ca-ES', {maximumFractionDigits: 0});
    document.getElementById('res-aigua').innerText = raw.aigua.toLocaleString('ca-ES', {maximumFractionDigits: 0});
    document.getElementById('res-oficina').innerText = raw.oficina.toLocaleString('ca-ES', {maximumFractionDigits: 2});
    document.getElementById('res-neteja').innerText = raw.neteja.toLocaleString('ca-ES', {maximumFractionDigits: 2});

    let totalNou = (raw.elec * costs.elec) + (raw.aigua * costs.aigua) + raw.oficina + raw.neteja;
    let percentatgeEstalvi = 0;
    if(totalOriginal > 0) percentatgeEstalvi = ((totalOriginal - totalNou) / totalOriginal) * 100;
    document.getElementById('res-estalvi').innerText = `-${percentatgeEstalvi.toFixed(1)}%`;

    // Actualitzar Gràfic de forma reactiva respectant el factor multiplicador d'anys
    if(chartInstance) {
        chartInstance.data.datasets[0].data = estacionalitat.elec.map(e => baseData.elec * e * costs.elec * mult.elec * estatTemps.factorGrafic);
        chartInstance.data.datasets[1].data = estacionalitat.aigua.map(e => baseData.aigua * e * costs.aigua * mult.aigua * estatTemps.factorGrafic);
        chartInstance.data.datasets[2].data = estacionalitat.oficina.map(e => baseData.oficina * e * mult.oficina * estatTemps.factorGrafic);
        chartInstance.data.datasets[3].data = estacionalitat.neteja.map(e => baseData.neteja * e * mult.neteja * estatTemps.factorGrafic);
        chartInstance.update(); 
    }
}

// 6. INICIALITZACIÓ DEL GRÀFIC (Respectant l'animació nativa)
function inicialitzarGrafic() {
    const ctx = document.getElementById('historicalChart').getContext('2d');
    const mesos = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mesos,
            datasets: [
                { label: 'Electricitat', data: [], borderColor: '#eab308', backgroundColor: '#eab308', borderWidth: 2, tension: 0.4, fill: false },
                { label: 'Aigua', data: [], borderColor: '#0ea5e9', backgroundColor: '#0ea5e9', borderWidth: 2, tension: 0.4, fill: false },
                { label: 'Oficina', data: [], borderColor: '#ea580c', backgroundColor: '#ea580c', borderWidth: 2, tension: 0.4, fill: false },
                { label: 'Neteja', data: [], borderColor: '#0d9488', backgroundColor: '#0d9488', borderWidth: 2, tension: 0.4, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        usePointStyle: true,
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((dataset, i) => {
                                const isHidden = !chart.isDatasetVisible(i);
                                return {
                                    text: dataset.label,
                                    fillStyle: isHidden ? 'transparent' : dataset.backgroundColor,
                                    strokeStyle: dataset.borderColor,
                                    lineWidth: 2,
                                    hidden: false, // Evita que es tatxi el text
                                    datasetIndex: i
                                };
                            });
                        }
                    },
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        if (ci.isDatasetVisible(index)) { ci.hide(index); } 
                        else { ci.show(index); }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#e2e8f0' }, title: { display: true, text: 'Despesa Estimada (€)' } },
                x: { grid: { display: false } }
            },
            interaction: { mode: 'index', intersect: false }
        }
    });
}
