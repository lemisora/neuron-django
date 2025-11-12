console.log("Hello");
/*
const btn = document.querySelector("button.mobile-menu-button");
const menu = document.querySelector(".mobile-menu");

btn.addEventListener("click", () => {
    menu.classList.toggle("hidden");
});*/

let uploadedCSV = null;
let chart; 
let csvHeaders = []; 
let xInput;
let yInput;

Plotly.purge('chart-container');
initializeChart();

document.getElementById("uploadCSV").addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = ev => {
            const csvContent = ev.target.result;
            uploadedCSV = csvContent;
            
            // Extract headers from first line
            const firstLine = csvContent.split('\n')[0];
            csvHeaders = firstLine.split(',').map(header => header.trim());
            
            console.log("CSV Headers:", csvHeaders);
            alert("CSV cargado correctamente. Headers: " + csvHeaders.join(', '));
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
    if(!checkData()){
        alert("check data")
        return
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
    drawNN("topolgyCanvas", [3,1])
    console.log(csvHeaders)

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

function checkData(){
    //Check headers x input
    xInput = document.getElementById("x-columns").value.split(',').map(col => col.trim());
    if( ! xInput.every(element => csvHeaders.includes(element))){
        alert("Header not found in csv x entry");
        return false;
    }
    //Check headers y input
    yInput = document.getElementById("y-column").value.split(',').map(col => col.trim());
    if( ! yInput.every(element => csvHeaders.includes(element))){
        alert("Header not found in csv y entry");
        return false;
    }

    return true;
    
}


//LEMIIIIII
function initializeChart() {
    const layout = {
        title: {
                text:'',
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

//LEMIIIIII
function drawNN(containerId, neurons, radius = 20, spacingY = 50, strokeWith="1.5") {
    const svg = document.getElementById(containerId);
    const svgWidth = svg.clientWidth || svg.getBoundingClientRect().width;
    const svgHeight = svg.clientHeight || svg.getBoundingClientRect().height;
    const numLayers = neurons.length;
    const layerSpacing = svgWidth / (numLayers + 1);
    biasG = []
    weights = []
    nCircles =[]

    // Limpia el SVG
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    let anterior = []
    for (let l = 0; l < numLayers; l++) {
        const x = layerSpacing * (l + 1);
        const layerHeight = neurons[l] * spacingY;
        const offsetY = (svgHeight - layerHeight) / 2 + radius*1.5;
        let positions = []
        const biasC =[]
        const weight = []
        const nCirclesC =[]
        for (let n = 0; n < neurons[l]; n++) {
            const y = offsetY + n * spacingY;
            
            // Dibuja neurona (círculo)
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            positions.push([x,y])
            circle.setAttribute("cx", x);
            circle.setAttribute("cy", y);
            circle.setAttribute("r", radius);
            circle.setAttribute("fill", "#4CAF50");
            svg.appendChild(circle);
            nCirclesC.push(circle);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", x);
            text.setAttribute("y", y);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "middle");
            text.setAttribute("fill", "white");
            text.setAttribute("font-size", "12");
            text.textContent = `n${n}`; // or any other label
            biasC.push(text);
            svg.appendChild(text);

            // Dibuja conexiones si no es la primera capa
            if (l >0) {
                const w = []
                //console.log(anterior)
                for (let j = 0; j < anterior.length; j++){
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", anterior[j][0]+radius);
                    line.setAttribute("y1", anterior[j][1]);
                    line.setAttribute("x2", x-radius);
                    line.setAttribute("y2", y);
                    line.setAttribute("stroke", "#151");
                    line.setAttribute("stroke-width", strokeWith);
                    w.push(line)
                    svg.appendChild(line);
                }
                weight.push(w)
            }
            
        }
        anterior = positions;
        biasG.push(biasC);
        nCircles.push(nCirclesC);
        if (l >0) {
            weights.push(weight)
        }
    }
}