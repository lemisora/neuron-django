import json
import math as mt
import numpy as np
import io, csv
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync
import threading

# import your nn and layer classes
from .nn import nn  # 👈 adjust to your actual filename

class TrainConsumer(WebsocketConsumer):
    """
    WebSocket consumer that trains the neural network
    using uploaded CSV data and frontend parameters,
    sending error per epoch to the client.
    """

    def connect(self):
        self.accept()
        self.send(json.dumps({"message": "Conexión establecida. Esperando datos de entrenamiento..."}))

    def receive(self, text_data):
        """
        When the frontend sends training configuration,
        start a background thread to train and stream progress.
        """
        data = json.loads(text_data)

        # CSV raw string (from frontend)
        csv_content = data.get("csv_data")
        learning_rate = float(data.get("learning_rate", 0.01))
        epochs = int(data.get("epochs", 10))
        x_columns = data.get("x_columns", "")
        y_column = data.get("y_column", "")
        activations = data.get("activations", [])
        neurons = data.get("neurons", [])
        normalize = data.get("normalize", False)
        round_output = data.get("round_output", False)
        test_size = data.get("test_size", 80)
        mode = data.get("monde", 0)

        #  Parse CSV content
        csv_reader = csv.reader(io.StringIO(csv_content))
        rows = list(csv_reader)
        headers = rows[0]
        values = np.array(rows[1:], dtype=float)

        # Identify X and Y
        x_idxs = [headers.index(c.strip()) for c in x_columns.split(",") if c.strip() in headers]
        y_idx = headers.index(y_column.strip())

        X = values[:, x_idxs]
        Y = values[:, [y_idx]]

        # Store training parameters
        self.training_config = {
            "X": X,
            "Y": Y,
            "topology": {"neurons": neurons, "activations": activations},
            "learning_rate": learning_rate,
            "epochs": epochs,
            "normalize": normalize,
            "test_size": test_size,
            "mode": mode,
        }

        # Start training thread
        thread = threading.Thread(target=self.train_network)
        thread.start()

    def train_network(self):
        """
        Trains the network and sends errors live per epoch.
        """
        X = self.training_config["X"]
        Y = self.training_config["Y"]
        lr = self.training_config["learning_rate"]
        epochs = self.training_config["epochs"]
        topology = self.training_config["topology"]
        normalize = self.training_config["normalize"]
        test_size = self.training_config["test_size"]
        mode = self.training_config["mode"]
        #SHUFFLE ARRAYS
        p = np.random.permutation(len(X))
        X_shuffled = X[p]
        Y_shuffled = Y[p]
        X_train = X_shuffled[:int(test_size*len(X))]
        Y_train = Y_shuffled[:int(test_size*len(X))]
        X_test = X_shuffled[int(test_size*len(X)):]
        Y_test = Y_shuffled[int(test_size*len(X)):]
        #  Initialize network topology (for example: 3 hidden layers)
        net = nn(topology["neurons"], topology["activations"])
        print(net)
        try:
            for epoch in range(epochs):
                for x, y in zip(X_train, Y_train):
                    net.forward(x)
                    net.backPropagationC(y, learningRate=lr)
                #Evaluete per epoch
                results = []
                trueValue = []  
                cont = 0
                for x, y in zip(X_test, Y_test):
                    res = net.forward(x)
                    results.append(res)
                    trueValue.append(y)
                    if res == y:
                        cont += 1
                
                
                if mode == 0:
                    results = np.array(results)
                    trueValue = np.array(trueValue)
                    accuracy = 1 - (np.mean(np.abs(results - trueValue)) / np.mean(np.abs(results)))
                elif mode ==1:  
                    accuracy = cont/len(X_test)
                serializable_results = [r.tolist() if isinstance(r, np.ndarray) else r for r in results]
                serializable_true = [t.tolist() if isinstance(t, np.ndarray) else t for t in trueValue]
                
                err = float(net.error(X, Y))
                self.send(json.dumps({
                    "epoch": epoch + 1,
                    "error": round(err, 6),
                    "results": serializable_results,
                    "trueValue": serializable_true,
                    "accuracy": round(float(accuracy*100), 2),
                }))
            self.send(json.dumps({
                "message": "Entrenamiento completado",
                "final_error": round(net.error(X, Y), 6)
            }))
        except Exception as e:
            self.send(json.dumps({"error": str(e)}))

    def disconnect(self, close_code):
        print("Socket closed:", close_code)
