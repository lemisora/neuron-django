import math as mt
import numpy as np


class layer:
        #Por default genera una capa de entrada
        #numero de neuronas, activacion, capa de entrada?
    def __init__(self, nc, activation=None):
        alpha = 0.01
        function = {
            "identidad": lambda x: x,
            "sigmoide": lambda x: 1/(1+np.exp(-x)),
            "tanh": lambda x: np.tanh(x),
            "relu": lambda x: np.maximum(0, x),
            "leaky_relu": lambda x: x if x > 0 else alpha * x,
            "pol": lambda x, w: x**w
        }
        functionD ={
            "identidad": lambda x: 1,
            "sigmoide": lambda x: (1/(1+np.exp(-x))) * (1 - (1/(1+np.exp(-x)))),
            "tanh": lambda x: 1 - np.tanh(x)**2,
            "relu": lambda x: 1 if x > 0 else 0 ,
            "leaky_relu": lambda x: 1 if x > 0 else alpha,
            "pol": lambda x, w: w*x**(w-1)
        }
        #Si no es primera capa agregar bias
        if activation:
            self.bias = np.random.rand(nc)
            self.delta = np.empty(nc)
            self.fun = function[activation]
            self.funD = functionD[activation]
        self.actF = activation
        self.act = np.empty(nc)
        self.weights = None
        self.n = nc

    #Todas las capas menos la ultima tienen un arreglo de pesos
    def conect(self, nl):
        self.weights = np.random.randn(nl.n, self.n) * np.sqrt(2 / self.n)
        
    def sumary(self):
        print(f'N neuronas: {self.n}')
        if self.actF:
            print(f'Activacion: {self.actF}')

class nn:
    def __init__(self, layers, functions):
        self.layers = layers.copy()
        self.normalizacion = {}
        for l in range(len(layers)):
            #Si es la primera capa no jalar funcion
            if l == 0:
                self.layers[l] = layer(layers[l])
            #Agregar la funcion en las capas y conectarlas
            else:
                self.layers[l] = layer(layers[l], functions[l-1])
                #Conectar las capas
                self.layers[l-1].conect(self.layers[l])

    def forward(self, patron):
        #Rercorrer las capas 
        for c in range(len(self.layers)):
            #c es indice una capa
            #Primera capa la activacion es el patron
            if c == 0:
                self.layers[c].act = patron.copy()
            else:
                #Sumatoira
                #print(f'Trabajando en la capa {c} con los pesos de la capa {c-1}')
                aux = np.dot(self.layers[c-1].weights, self.layers[c-1].act) + self.layers[c].bias
                for i in range(len(aux)):
                    self.layers[c].act[i] = self.layers[c].fun(aux[i])
        return self.layers[-1].act

    def backPropagation(self, salida, learningRate=0.1):
        #Por cada capa desde atras
        #C es una indice de capa se recorre desde el final hasta el segundo
        err = sum(((salida - self.layers[-1].act)**2)/2)
        for c in range(len(self.layers) - 1, 0, -1):
            #Para la ultima capa
            if c == len(self.layers)-1:
                #Crear array de (si - yi)
                errP = -(salida - self.layers[c].act)
                #Por cada neurona actualizar bias y peso relacionado
                for i in range(len(self.layers[c].bias)):
                    #calcular delta de la neurona
                    self.layers[c].delta[i] = errP[i]*self.layers[c].funD(self.layers[c].act[i])
                    self.layers[c].bias[i] = self.layers[c].bias[i] - learningRate*self.layers[c].delta[i]
                    #Pesos de la capa pasada      pesos de la capa pasada                             activacion de la capa pasada
                    self.layers[c-1].weights[i] = self.layers[c-1].weights[i] - (learningRate*self.layers[c].delta[i]) * self.layers[c-1].act.copy() 

            else:
                #Programamos para las capas ocultas
                #Calculo del nuevo delta neesistamos la sumatoria de todos los deltas por pesos de la capa siguiente
                delta_ant = np.sum(np.dot(self.layers[c+1].delta, self.layers[c].weights))
                #Para cada neurona de la capa
                for i in range(len(self.layers[c].bias)):
                    #Funcion derivada evaulada en weights*activacion +umbral = actviacion de esta neurona
                    self.layers[c].delta[i] = delta_ant*self.layers[c].funD(self.layers[c].act[i])
                    #Bias de la neurona
                    self.layers[c].bias[i] = self.layers[c].bias[i] - learningRate*self.layers[c].delta[i]
                    #Weights
                    self.layers[c-1].weights[i] = self.layers[c-1].weights[i] - (learningRate*self.layers[c].delta[i]) * self.layers[c-1].act.copy() 
        return err
    
    def backPropagationC(self, salida, learningRate=0.1):
        err = np.sum(((salida - self.layers[-1].act) ** 2) / 2)

        # Recorrer de la última capa hacia la primera oculta
        for c in range(len(self.layers) - 1, 0, -1):
            capa = self.layers[c]
            capa_anterior = self.layers[c - 1]

            # Si es la capa de salida
            if c == len(self.layers) - 1:
                # Calcular delta: (y - s) * f'(z)
                error = capa.act - salida  # Ojo: salida es la esperada
                capa.delta = error * np.array([capa.funD(a) for a in capa.act])

            else:
                # Capa oculta: delta = sum(delta_siguiente * pesos) * f'(z)
                # pesos de la capa actual: (n_siguiente, n_actual)
                suma = np.dot(self.layers[c].weights.T, self.layers[c + 1].delta)
                capa.delta = suma * np.array([capa.funD(a) for a in capa.act])

            # Actualizar pesos y bias usando los deltas
            for i in range(capa.n):
                capa.bias[i] -= learningRate * capa.delta[i]
                capa_anterior.weights[i] -= learningRate * capa.delta[i] * capa_anterior.act
                # Nota: capa_anterior.weights[i] afecta a la neurona i de la capa actual

        return err



    def evaluate(self, x, normalizar=False):
        if normalizar:
            x = self.normalizar(x, self.normalizacion["x_min"], self.normalizacion["x_max"])
            out = self.forward(x)
            return self.desnormalizar_minmax(out, self.normalizacion["s_min"], self.normalizacion["s_max"])
        else:
            return self.forward(x)
 
    
    def error(self, X, S):
        error = 0
        for x, s in zip(X, S):
            y = self.forward(x)
            error += sum(((s - y)**2)/2)
        return error/len(X)

                
    def train(self, X, S, epoch=100, learningRate=0.1, normalizar=False, quiet=True):
        if normalizar:
            x_min, x_max = X.min(), X.max()
            s_min, s_max = S.min(), S.max()
            self.normalizacion = {
                "x_min": x_min, "x_max": x_max,
                "s_min": s_min, "s_max": s_max
            }
            X = self.normalizar_vec(X, x_min, x_max)
            S = self.normalizar_vec(S, s_min, s_max)
           

        for e in range(epoch):
            for x, s in zip(X, S):
                self.forward(x)
               
                self.backPropagationC(s, learningRate=learningRate)
            if not quiet:
                print(f'Epoca: {e} Error: {self.error(X, S)}')
        print(f'Error en la red: {self.error(X, S)}')

    def validacion(self, X, S, epoch=100, normalizar=False, learningRate=0.01, val=0.8):
        #Split data
        len(X)
        trainX = X[:int(len(X)*val)]
        trainS = S[:int(len(X)*val)]
        testX = X[int(len(X)*val):]
        testS = S[int(len(X)*val):]
        if normalizar:
            x_min, x_max = trainX.min(), trainX.max()
            s_min, s_max = trainS.min(), trainS.max()
            self.normalizacion = {
                "x_min": x_min, "x_max": x_max,
                "s_min": s_min, "s_max": s_max
            }
            trainX = self.normalizar_vec(trainX, x_min, x_max)
            trainS = self.normalizar_vec(trainS, s_min, s_max)
            testX = self.normalizar_vec(testX, x_min, x_max )
            testS = self.normalizar_vec(testS, s_min, s_max)

        self.train(trainX, trainS, epoch=epoch, learningRate=learningRate, normalizar=normalizar)

        #Evaluar
        
    @staticmethod
    def normalizar(x, xmin, xmax, a=0, b=1):
        return a + (x - xmin) * (b - a) / (xmax - xmin)

    @staticmethod
    def normalizar_vec(X, xmin=None, xmax=None, a=0, b=1):
        if xmin is None:
            xmin = X.min()
        if xmax is None:
            xmax = X.max()
        return a + (X - xmin) * (b - a) / (xmax - xmin)

    @staticmethod
    def desnormalizar_minmax(x_norm, xmin, xmax, a=0, b=1):
        return ((x_norm - a) * (xmax - xmin)) / (b - a) + xmin

#class nnr:
 #   def __init__(self, layers, activation, ):
#np.random.seed(14)

#nn =  nn([1,10,30,1], ["tanh","tanh","identidad"])
#Primera capa no tiene bias

#nn.layers[0].weights[0] = 0.5
#nn.layers[1].weights[0] = 0.3
#nn.layers[-2].bias[0] = 1
#nn.layers[-1].bias[0] = 2
#patron = np.array([[1],[2],[3],[4],[5],[6],[7], [8], [9], [10]])
#s = np.array([[1],[4],[9],[16],[25],[36],[49], [64], [91], [100]], dtype=float)
#print(s.shape)
#for i in range(7):
#    print(mt.sin(i+1))
#    s[i][0] = mt.sin(i+1)
#print(s)
#nn.validacion(patron, s, learningRate=0.0001, epoch=20, normalizar=True)
###
#

#for i in range(20):
#    print(f'{i}: {nn.evaluate(np.array([i]), normalizar=True)[0]}')

#print(patron)

#print(f'peso {nn.layers[0].weights} bias {nn.layers[-1].bias} \npeso {nn.layers[1].weights} bias {nn.layers[-2].bias}')


##

#for c in range(len(nn.layers)):
#    if c!=0:
#        print(f'bias: {nn.layers[c].bias}')
#    print(f'weights: {nn.layers[c].weights}')


        