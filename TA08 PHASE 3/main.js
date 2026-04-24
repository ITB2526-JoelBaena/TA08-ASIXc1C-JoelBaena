// 1. DADES BASE I VARIABLES
const baseData = {
    elec: 6000,    // kWh
    aigua: 135000, // Litres
    oficina: 215,  // Euros
    neteja: 620    // Euros
};

// PREUS REALS: Elec (0.20€/kWh), Aigua (0.0025€/Litre)
const costs = { elec: 0.20, aigua: 0.0025, oficina: 1, neteja: 1 };

const estacionalitat = {
    elec: [1.3, 1.3, 1.1, 1.0, 0.9, 0.9, 0.8, 0.8, 0.9, 1.0, 1.2, 1.3],
    aigua:[0.9, 0.9, 1.0, 1.0, 1.1, 1.2, 1.2, 0.8, 1.1, 1.0, 0.9, 0.9],
    oficina:[1.2, 1.0, 1.0, 1.0, 1.1, 1.3, 0.2, 0.1, 1.5, 1.1, 1.0, 0.8],
    neteja: [1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 0.5, 0.5, 1.2, 1.0, 1.0, 1.0]
};

let modeActual = 'any';
let chartInstance = null;

// Límits del calendari segons els arxius ITB Leaks
const MIN_DATE = new Date('2024-02-25');
const MAX_DATE = new Date('2025-01-17');

// 2. INICIALITZACIÓ
window.onload = () => {
    inicialitzarGrafic();
    actualitzarSimulacio();
};

// 3. NAVEGACIÓ I PESTANYES
function canviarVista(vistaId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(vistaId).classList.add('active');
}

function obrirPestanya(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 4. CONTROL DEL TEMPS
function setPeriode(mode) {
    modeActual = mode;
    document.querySelectorAll('.time-controls button').forEach(b => b.classList.remove('active'));

    if (mode === 'any') document.getElementById('btn-any').classList.add('active');
    if (mode === 'curs') document.getElementById('btn-curs').classList.add('active');

    actualitzarSimulacio();
}

// 5. MOTOR DE CÀLCUL PRINCIPAL
function actualitzarSimulacio() {
    let raw = { elec: 0, aigua: 0, oficina: 0, neteja: 0 };
    let titol = "";

    // 5.1 Càlcul temporal base
    if (modeActual === 'any') {
        titol = "Calculant: Any Complet (12 mesos)";
        Object.keys(raw).forEach(k => {
            for(let m=0; m<12; m++) raw[k] += baseData[k] * estacionalitat[k][m];
        });
    }
    else if (modeActual === 'curs') {
        titol = "Calculant: Curs Escolar (Set-Jun)";
        let mesos = [8,9,10,11,0,1,2,3,4,5];
        Object.keys(raw).forEach(k => {
            mesos.forEach(m => raw[k] += baseData[k] * estacionalitat[k][m]);
        });
    }
    else if (modeActual === 'custom') {
        let d1 = document.getElementById('data-inici').value;
        let d2 = document.getElementById('data-fi').value;
        if(d1 && d2) {
            let date1 = new Date(d1);
            let date2 = new Date(d2);

            // Validació dels límits de dades dels ITB Leaks
            if(date1 < MIN_DATE || date2 > MAX_DATE) {
                titol = "Error: Les dades només existeixen entre 25/02/2024 i 17/01/2025";
                document.getElementById('titol-resultats').innerText = titol;
                return;
            }

            let dies = (date2 - date1) / 86400000 + 1;
            if(dies > 0) {
                titol = `Calculant: Tram personalitzat (${dies} dies)`;
                let mesosEq = dies / 30.44;
                Object.keys(raw).forEach(k => {
                    let mitjanaM = estacionalitat[k].reduce((a, b) => a + b) / 12;
                    raw[k] = baseData[k] * mesosEq * mitjanaM;
                });
            } else { titol = "Error: La data inicial ha de ser menor"; return; }
        } else { titol = "Calculant: Selecciona dates i prem Calcular"; }
    }

    // Cost original per comparar estalvis
    let totalOriginal = (raw.elec * costs.elec) + (raw.aigua * costs.aigua) + raw.oficina + raw.neteja;

    // 5.2 Multiplicadors d'estalvi
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

    // Apliquem l'estalvi a les xifres crues
    raw.elec *= mult.elec;
    raw.aigua *= mult.aigua;
    raw.oficina *= mult.oficina;
    raw.neteja *= mult.neteja;

    // 5.3 Renderitzat xifres finals
    document.getElementById('titol-resultats').innerText = titol;
    document.getElementById('res-elec').innerText = raw.elec.toLocaleString('ca-ES', {maximumFractionDigits: 0});
    document.getElementById('res-aigua').innerText = raw.aigua.toLocaleString('ca-ES', {maximumFractionDigits: 0});
    document.getElementById('res-oficina').innerText = raw.oficina.toLocaleString('ca-ES', {maximumFractionDigits: 2});
    document.getElementById('res-neteja').innerText = raw.neteja.toLocaleString('ca-ES', {maximumFractionDigits: 2});

    let totalNou = (raw.elec * costs.elec) + (raw.aigua * costs.aigua) + raw.oficina + raw.neteja;
    let percentatgeEstalvi = 0;
    if(totalOriginal > 0) percentatgeEstalvi = ((totalOriginal - totalNou) / totalOriginal) * 100;
    document.getElementById('res-estalvi').innerText = `-${percentatgeEstalvi.toFixed(1)}%`;

    // 5.4 Actualització reactiva del gràfic
    if(chartInstance) {
        chartInstance.data.datasets[0].data = estacionalitat.elec.map(e => baseData.elec * e * costs.elec * mult.elec);
        chartInstance.data.datasets[1].data = estacionalitat.aigua.map(e => baseData.aigua * e * costs.aigua * mult.aigua);
        chartInstance.data.datasets[2].data = estacionalitat.oficina.map(e => baseData.oficina * e * mult.oficina);
        chartInstance.data.datasets[3].data = estacionalitat.neteja.map(e => baseData.neteja * e * mult.neteja);
        chartInstance.update();
    }
}

// 6. GRÀFIC SENSE TACHADO EN LLEGENDA I AMB ANIMACIÓ FLUIDA
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
                        // Generació de llegenda on evitem que es ratlli la lletra (strikethrough)
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map((dataset, i) => {
                                const isHidden = !chart.isDatasetVisible(i);
                                return {
                                    text: dataset.label,
                                    fillStyle: isHidden ? 'transparent' : dataset.backgroundColor,
                                    strokeStyle: dataset.borderColor,
                                    lineWidth: 2,
                                    hidden: false, // AIXÒ EVITA QUE ES TACHI EL TEXT
                                    datasetIndex: i
                                };
                            });
                        }
                    },
                    // Comportament en fer clic a la llegenda
                    onClick: function(e, legendItem, legend) {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;

                        // Ocultem o mostrem la línia. Les funcions hide/show ja inclouen l'animació per defecte.
                        if (ci.isDatasetVisible(index)) {
                            ci.hide(index);
                        } else {
                            ci.show(index);
                        }
                        // Hem eliminat el ci.update() d'aquí per no tallar l'animació nativa.
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