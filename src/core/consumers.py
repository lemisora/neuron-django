import json
import numpy as np
import io, csv
from channels.generic.websocket import WebsocketConsumer
import threading
from django.core.cache import cache
from .nn import nn


class TrainConsumer(WebsocketConsumer):

    def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.accept()
        self.send(json.dumps({"message": "Conexión establecida"}))

    def receive(self, text_data):

        data = json.loads(text_data)
        # ----------------------------------------------------------
        # 1) Initialize Network (Apply button)
        # ----------------------------------------------------------
        print(data)
        if data.get("type") == "init_net":
            ans = self.initialize(data)
            self.send(json.dumps(ans))
            return
        # ----------------------------------------------------------
        # 2) Training request
        # ----------------------------------------------------------
        elif(data.get("type") == "train"):
            mode = data.get("mode", 0)
            epochs = int(data.get("epochs", 10))
            learning_rate = float(data.get("learning_rate", 0.01))
            round_Output = data.get("round_output", False)
            #Send data
            self.train_config = {
                "learning_rate": learning_rate,
                "epochs": epochs,
                "mode": mode,
                "round_output": round_Output,
            }
            threading.Thread(target=self.train_network).start()
            return
        self.send(json.dumps({"message": "Unkown process"}))
    # =====================================================================
    # TRAINING
    # =====================================================================
    def train_network(self):

        cfg  = self.train_config
        lr = cfg[ "learning_rate"]
        epochs = cfg["epochs"]
        mode = cfg["mode"]
        round_output = cfg["round_output"]

        #Restore data
        cache_cfg = cache.get(f"nn_cfg_{self.session_id}")
        print(self.session_id)
        cached_W = cache.get(f"nn_weights_{self.session_id}")
        cached_B = cache.get(f"nn_biases_{self.session_id}")
        neurons = cache_cfg["neurons"]
        activations = cache_cfg["activations"]
        X_train = cache.get(f"train_X_{self.session_id}")
        Y_train = cache.get(f"train_Y_{self.session_id}")
        X_test = cache.get(f"test_X_{self.session_id}")
        Y_test = cache.get(f"test_Y_{self.session_id}")


        # Create new network with topology
        net = nn(neurons, activations)
        #Load network weights and biases
        net.set_weights(cached_W)
        net.set_biases(cached_B)
        print("Loaded network weights from cache.")

        # ------------------------------------------------------------
        # TRAIN
        # ------------------------------------------------------------
        try:
            for epoch in range(epochs):

                for x, y in zip(X_train, Y_train):
                    net.forward(x)
                    net.backPropagationC(y, learningRate=lr)
                # Evaluate
                results = []
                trueVal = []
                count = 0
                for x, y in zip(X_test, Y_test):
                    res = net.forward(x)
                    results.append(res)
                    trueVal.append(y)
                    if round_output:
                        for r in res:
                            r = int(r)
                    if res == y:
                        count += 1
                if mode == 0:
                    results_np = np.array(results)
                    true_np    = np.array(trueVal)
                    accuracy = 1 - (np.mean(np.abs(results_np - true_np)) /
                                    np.mean(np.abs(results_np)))
                else:
                    accuracy = count / len(X_test)

                err = float(net.error(X_train, Y_train))
                # Send live update
                self.send(json.dumps({
                    "epoch": epoch+1,
                    "error": round(err, 6),
                    "accuracy": round(float(accuracy*100), 2),
                }))

            # ------------------------------------------------------------
            # SAVE UPDATED WEIGHTS BACK TO CACHE
            # ------------------------------------------------------------
            cache.set(f"nn_weights_{self.session_id}", net.weights())
            cache.set(f"nn_biases_{self.session_id}", net.biases())

            self.send(json.dumps({
                "message": "Entrenamiento completado",
                "final_error": round(net.error(X_train, Y_train), 6)
            }))

        except Exception as e:
            print(e)
            self.send(json.dumps({"error": str(e)}))


    # =====================================================================
    # INIT NETWORK (Apply)
    # =====================================================================
    def initialize(self, data):
        """
        Creates NN and stores ONLY weights/biases in cache.
        Split in train val stores in cache
        normalize if is required
        Avoids pickling whole object.
        """
        try:
            csv_content = data.get("csv_data")
            neurons = data.get("neurons", [])
            activations = data.get("activations", [])
            csv_content = data.get("csv_data")
            x_columns = data.get("x_columns", "")
            y_columns = data.get("y_column", "")
            activations = data.get("activations", [])
            neurons = data.get("neurons", [])
            test_size = float(data.get("test_size", 0.8))
            normalize = data.get("normalize", False)
            round_Output = data.get("round_output", False)


            # Parse CSV
            csv_reader = csv.reader(io.StringIO(csv_content))
            rows = list(csv_reader)
            headers = rows[0]
            values = np.array(rows[1:], dtype=float)

            x_idxs = [headers.index(c.strip()) for c in x_columns.split(",") if c.strip() in headers]
            y_idx  = [headers.index(c.strip()) for c in y_columns.split(",") if c.strip() in headers]

            X = values[:, x_idxs]
            Y = values[:, y_idx]
            #Normalize
            if normalize:
                for x in X:
                    x = nn.normalizar_vec(x)
                for y in Y:
                    y = nn.normalizar_vec(y)

            #Split vec
            X_train, Y_train, X_test, Y_test = nn.split_Vec(X, Y, test_size)
            print("split created")
            # Create network
            net = nn(neurons, activations)
            print("red creada")
            acts = net.evaluate_vec(X_test, round_Output)
            print(acts)
            # Save only required data
            cache.set(f"nn_cfg_{self.session_id}", {"neurons": neurons, "activations": activations})
            cache.set(f"nn_weights_{self.session_id}", net.weights())
            cache.set(f"nn_biases_{self.session_id}",  net.biases())
            cache.set(f"train_X_{self.session_id}", X_train)
            cache.set(f"train_Y_{self.session_id}", Y_train)
            cache.set(f"test_X_{self.session_id}", X_test)
            cache.set(f"test_Y_{self.session_id}", Y_test)

            print(f"NN initialized and saved to cache (weights only). {self.session_id}")

            return {
                "type": "net_initialized",
                "topology": {"neurons": neurons, "activations": activations},
                "weights": net.weights(),
                "biases": net.biases(),
                "results": acts,
            }

        except Exception as e:
            print(e)
            return {"error": str(e)}
            
