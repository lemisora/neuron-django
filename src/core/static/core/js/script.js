/*
const btn = document.querySelector("button.mobile-menu-button");
const menu = document.querySelector(".mobile-menu");

btn.addEventListener("click", () => {
    menu.classList.toggle("hidden");
});*/

/* 
    Existen los siguientes casos
    ---regresion
    //Ejes
    1 en entrada 1 en salida  -> default
    2 en entrada 1 en salida
    1 en entrada 2 en salida 
    ---Clasificacion (puntos) limitar salida a 1 en clasificacion
    2 en entrada 1 salida
    3 en entrada 1 salida
    
*/

let uploadedCSV = null;

let csvHeaders = []; 
let xInput;
let yInput;
let layerCounter = 1;
const regression = document.getElementById("regression");
const classification = document.getElementById("classification");
// Variable to store mode (0 = regression, 1 = classification)
let mode = null;
const session_id = crypto.randomUUID();

Plotly.purge('chart-error-container');
let chart = initializeChart("chart-error-container");
let chartVD = initializeChart("chart-vd-container");

regression.checked = true;

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

document.getElementById("apply").addEventListener("click", () => {
    if (!uploadedCSV) {
        alert("Primero carga un CSV");
        return;
    }

    if(!checkData()){
        alert("check data")
        return
    }

    const params = {
        type: "init_net",
        csv_data: uploadedCSV, 
        learning_rate: document.getElementById("learning-rate").value,
        epochs: document.getElementById("epoch").value,
        test_size: document.getElementById("test-size").value * 0.01,
        x_columns: document.getElementById("x-columns").value,
        y_column: document.getElementById("y-column").value,
        neurons: getNeurons(),
        activations: getActivations(),
        normalize: document.getElementById("normalize").checked,
        round_output: document.getElementById("round-output").checked,
        mode: mode,
    };
    console.log("clicked apply")
    const socket = new WebSocket("ws://" + window.location.host + "/ws/train/" + session_id + "/");

    socket.onopen = () => {
        socket.send(JSON.stringify(params));
    };

    socket.onmessage = e => {
        const data = JSON.parse(e.data);

        if (data.type === "net_initialized") {
            console.log("Net initialized:", data);

            // Save to localStorage
            localStorage.setItem("nn_init", JSON.stringify(data));
            localStorage.setItem("nn_params", JSON.stringify(params));

            alert("Red creada correctamente");
            chartVD = initializeChartV("chart-vd-container",1, [[1,1,1],[1,2,3],[1,3,4] ], [0,1,0], ["one", "tow"], ["three"]);

            // Optional: draw structure
            console.log(data.topology.neurons)
            drawNN("topolgyCanvas", data.topology.neurons);
        }
    };  
});
/*
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
        test_size: document.getElementById("test-size").value * 0.01,
        x_columns: document.getElementById("x-columns").value,
        y_column: document.getElementById("y-column").value,
        neurons: getNeurons(),
        activations: getActivations(),
        normalize: document.getElementById("normalize").checked,
        round_output: document.getElementById("round-output").checked,
        mode: mode,
    };
    drawNN("topolgyCanvas", getNeurons())
    chartVD = initializeChartV("chart-vd-container",1, [[1,1,1],[1,2,3],[1,3,4] ], [0,1,0], ["one", "tow"], ["three"]);
    console.log(getNeurons())
    console.log(getActivations())

    // Guardar localmente antes de entrenar
    localStorage.setItem("nn_params", JSON.stringify(params));
    alert("Parámetros aplicados correctamente");
});*/

document.getElementById("train").addEventListener("click", () => {
    const params = JSON.parse(localStorage.getItem("nn_params") || "{}");
    if (!params.csv_data) {
        alert("Debes aplicar primero los parámetros y cargar el CSV.");
        return;
    }
    params.type = "train";   // <<---- IMPORTANT

    const socket = new WebSocket("ws://" + window.location.host + "/ws/train/" + session_id + "/");

    socket.onopen = () => {
        socket.send(JSON.stringify(params));
    };
    // Reset chart
    Plotly.purge('chart-error-container');
    initializeChart('chart-error-container');

    socket.onmessage = (event) => {
        
        
        const data = JSON.parse(event.data);
        if (data.epoch) {
            console.log(`Época ${data.epoch} → Error: ${data.error}`);
            Plotly.extendTraces('chart-error-container', {
                    x: [[data.epoch]],
                    y: [[data.error]]
                }, [0]);
        } else if (data.message) {
            console.log(data.message);
        } else if (data.error) {
            console.error("Error:", data.error);
        }
        if(data.accuracy){
            document.getElementById("accuracy").textContent = data.accuracy
        }
    };
});



regression.addEventListener("change", () => {
    if (regression.checked) {
      classification.checked = false;
      mode = 0;
    } else {
      mode = null;
    }
    console.log("Mode:", mode);
});

classification.addEventListener("change", () => {
    if (classification.checked) {
      regression.checked = false;
      mode = 1;
    } else {
      mode = null;
    }
    console.log("Mode:", mode);
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

//Add new row to hidden layers
function addRow() {
    const container = document.querySelector('#layers-container');
    // Create the row container with grid layout
    const fila = document.createElement('div');
    fila.className = 'grid grid-cols-[auto,1fr,auto] text-sm text-white mb-2 gap-x-4';
    fila.setAttribute('data-numero', layerCounter);

    // Columna 1: # (counter)
    const col1 = document.createElement('div');
    col1.className = 'flex justify-center items-center px-1';
    col1.textContent = layerCounter++;

    // Columna 2: Nc (number input)
    const col2 = document.createElement('div');
    col2.className = 'flex justify-center items-center ml-4';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.value = '1';
    input.className = 'w-full bg-gray-800 border border-gray-700 rounded-md py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500';
    col2.appendChild(input);

    // Columna 3: Activación (select)
    const col3 = document.createElement('div');
    col3.className = 'flex justify-center items-center';
    const select = document.createElement('select');
    select.className = 'bg-gray-800 border border-gray-700 rounded-md py-1 px-2 text-white focus:outline-none focus:ring-1 focus:ring-purple-500';
    
    // Using the same options as your existing select
    ['ReLU', 'Sigmoid', 'Linear'].forEach(op => {
        const option = document.createElement('option');
        option.value = op;
        option.textContent = op;
        select.appendChild(option);
    });
    col3.appendChild(select);

    // Append all columns to the row
    fila.appendChild(col1);
    fila.appendChild(col2);
    fila.appendChild(col3);

    // Append the row to the container
    container.appendChild(fila);
}

//Delete the last row
function deleteRow() {
    const container = document.querySelector('#layers-container');
    const filas = container.querySelectorAll('div[data-numero]');
    
    if (filas.length > 0) {
        const lastFila = filas[filas.length - 1];
        container.removeChild(lastFila);
        layerCounter--;
    }
}


// Function to get neurons number
function getNeurons() {
    const capas = [];
    capas.push(xInput.length)
    const container = document.querySelector('#layers-container');
    const filas = container.querySelectorAll('div[data-numero]');
    
    filas.forEach(fila => {
        const neurons = fila.querySelector('input[type="number"]').value;
        const activation = fila.querySelector('select').value;
        
        capas.push(
            parseInt(neurons)
        );
    });
    capas.push(yInput.length)
    return capas;
}

function getActivations() {
    const activations = [];
    const container = document.querySelector('#layers-container');
    const filas = container.querySelectorAll('div[data-numero]');
    const lasyLayer = document.getElementById('lastLayerActivation')
    filas.forEach(fila => {
        const activation = fila.querySelector('select').value;
        
        activations.push(
            activation
        );
    });
    activations.push(lasyLayer.value)
    return activations;
}

function initializeChartV(conteinerId, mode, inVec, outVec, inVecNames, outVecNames){
    let trace
    let layout = {
        scene: {
            xaxis: { title: inVecNames[0] },
            yaxis: { title: inVecNames[1] },
            },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
    };
    if( mode === 1){
        trace = {
            x: inVec[0],
            y: inVec[1],
            mode: 'markers',
            type: 'scatter',
            marker: {
                size: 6,
                color: outVec, // color points by z value
                colorscale: 'Viridis',
                opacity: 0.8
            }
        };
        
        if (inVec.length == 3){
            trace.z = inVec[2] //add third dimention if inVec is 3d
            trace.type = 'scatter3d'
            Object.assign(layout.scene, {
                zaxis: { title: inVecNames[2] }
            });
        }
    }else{
        trace = {
            x: inVec[0],
            y: outVec[0],
            mode: 'lines',
            type: 'scatter',
            marker: {
                size: 6,
                color: outVec, // color points by z value
                colorscale: 'Viridis',
                opacity: 0.8
                }
            };
        if (inVec.length == 2){
            trace.z = inVec[1] //add third dimention if inVec is 3d
            trace.type = 'surface'
            Object.assign(layout.scene, {
                zaxis: { title: inVecNames[2] }
            });
        }else if (outVec.length == 2){
            trace.z = outVec[1] //add third dimention if inVec is 3d
            trace.type = 'surface'
            Object.assign(layout.scene, {
                zaxis: { title: outVecNames[2] }
            });
        }

    }
    return Plotly.newPlot(conteinerId, [trace], layout);
}

//LEMIIIIII axis is a list with 
function initializeChart(conteinerId) {
   
    const layout = {
        title: {
            text: '',
            font: {
                color: '#D1D5DB' // Color de texto similar a text-gray-300
            }
        },
        xaxis: {
            title: 'Época',
            font: { color: '#D1D5DB' },
            tickfont: { color: '#9CA3AF' }, // Similar a text-gray-400
            linecolor: '#4B5563',           // Similar a border-gray-600
            gridcolor: '#374151',           // Similar a border-gray-700
            zerolinecolor: '#4B5563',
        },
        yaxis: {
            title: 'Error',
            autorange: true,
            font: { color: '#D1D5DB' },
            tickfont: { color: '#9CA3AF' },
            linecolor: '#4B5563',
            gridcolor: '#374151',
            zerolinecolor: '#4B5563',
        },
        margin: { t: 10, b: 75, l: 30, r: 30 },
        
        // Fondo transparente para heredar el de Tailwind
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',

        // Plotly se ajustará automáticamente al tamaño del div
        autosize: true,
    };
    
    const data = [{
        x: [],
        y: [],
        type: 'scatter',
        mode: 'lines',
        line: {color: '#cb6ce6', width: 2},
        marker: {size: 8}
    }];

    // Configuración para un mejor comportamiento responsivo.
    const config = { responsive: true };
    
    return Plotly.newPlot(conteinerId, data, layout, config);
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