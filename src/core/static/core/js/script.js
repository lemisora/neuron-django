console.log("Hello");
/*
const btn = document.querySelector("button.mobile-menu-button");
const menu = document.querySelector(".mobile-menu");

btn.addEventListener("click", () => {
    menu.classList.toggle("hidden");
});*/

let uploadedCSV = null;
let chart; 

document.getElementById("uploadCSV").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = ev => {
            uploadedCSV = ev.target.result;
            alert("CSV cargado correctamente");
        };
        reader.readAsText(file);
    };
    input.click();
});

document.getElementById("apply").addEventListener("click", async () => {
    if (!uploadedCSV) {
        alert("Primero carga un CSV.");
        return;
    }

    const params = {
        csv_data: uploadedCSV,
        learning_rate: document.getElementById("learning-rate").value,
        epochs: document.getElementById("epoch").value,
        x_columns: document.getElementById("x-columns").value,
        y_column: document.getElementById("y-column").value,
        normalize: document.getElementById("normalize").checked,
        round_output: document.getElementById("round-output").checked,
    };

    // Guardar localmente antes de entrenar
    localStorage.setItem("nn_params", JSON.stringify(params));
    alert("Parámetros aplicados correctamente");
});

document.getElementById("train").addEventListener("click", () => {
    const params = JSON.parse(localStorage.getItem("nn_params") || "{}");
    if (!params.csv_data) {
        alert("Debes aplicar primero los parámetros y cargar el CSV.");
        return;
    }

    const socket = new WebSocket("ws://" + window.location.host + "/ws/train/");

    socket.onopen = () => {
        socket.send(JSON.stringify(params));
    };
    // Reset chart
    Plotly.purge('chart-container');
    initializeChart();

    socket.onmessage = (event) => {
        
        
        const data = JSON.parse(event.data);
        if (data.epoch) {
            console.log(`Época ${data.epoch} → Error: ${data.error}`);
            Plotly.extendTraces('chart-container', {
                    x: [[data.epoch]],
                    y: [[data.error]]
                }, [0]);
        } else if (data.message) {
            console.log(data.message);
        } else if (data.error) {
            console.error("Error:", data.error);
        }
    };
});

function initializeChart() {
    const layout = {
        title: {
                text:'Error',
                font: {
                    color: '#f4f4f4' // color del título
                }
            },
        xaxis: {
            title: 'Epoca',
            dtick: 1,
            font: {
                    color: '#f4f4f4' 
            },
            tickfont: { color: '#f4f4f4' },     
            linecolor: '#f4f4f4',               
            gridcolor: '#f4f4f455',             
            zerolinecolor: '#f4f4f4',
        },
        yaxis: {
            title: 'Error',
            autorange: true,
            font: {
                color: '#f4f4f4' 
            },
            tickfont: { color: '#f4f4f4' },     
            linecolor: '#f4f4f4',               
            gridcolor: '#f4f4f455',             
            zerolinecolor: '#f4f4f4',
        },
        margin: {t: 30, b: 40, l: 50, r: 30},
        paper_bgcolor: '#1A1A1D',   // fondo general
        plot_bgcolor: '#1A1A1F',    // fondo del área de trazado
        autosize: true,
        height: window.innerHeight * 0.39
    };
    
    const data = [{
        x: [],
        y: [],
        type: 'scatter',
        mode: 'lines',
        line: {color: '#cb6ce6', width: 2},
        marker: {size: 8}
    }];
    
    chart = Plotly.newPlot('chart-container', data, layout);
}