import csv, io, threading, json
from django.shortcuts import render
from django.http import JsonResponse
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.views.decorators.csrf import csrf_exempt

def home(request):
    return render(request, "core/home.html")

@csrf_exempt
def upload_csv_and_train(request):
    if request.method == "POST":
        csv_file = request.FILES.get("csv_file")
        learning_rate = float(request.POST.get("learning_rate", 0.01))
        epochs = int(request.POST.get("epochs", 10))
        x_columns = request.POST.get("x_columns", "")
        y_column = request.POST.get("y_column", "")
        test_size = float(request.POST.get("test_size", 0.8))
        normalize = request.POST.get("normalize") == "true"
        round_output = request.POST.get("round_output") == "true"

        if not csv_file:
            return JsonResponse({"error": "No CSV file provided."}, status=400)
        if not csv_file.name.endswith('.csv'):
            return JsonResponse({"error": "File must be a CSV."}, status=400)

        # Process the CSV (you can load into pandas if needed)
        import io, csv
        text = io.TextIOWrapper(csv_file.file, encoding='utf-8')
        reader = csv.reader(text)
        data = [row for row in reader]
        print(data)

        # Store parameters if needed, or start training thread
        # but DO NOT start training yet; training starts when the socket connects.

        return JsonResponse({"message": "Datos cargados y parámetros aplicados correctamente."})

    return JsonResponse({"error": "Invalid request."}, status=400)
