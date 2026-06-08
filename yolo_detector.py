import sys
import json
from ultralytics import YOLO

def run_inference(image_path):
    try:
        # 1. Cargar el modelo pre-entrenado nano de YOLOv8 (ligero y rápido)
        model = YOLO("yolov8n.pt")
        
        # 2. Ejecutar la predicción en la imagen (verbose=False para no ensuciar la consola)
        results = model(image_path, verbose=False)
        
        # 3. Extraer las dimensiones reales y las cajas de detección
        first_result = results[0]
        height, width = first_result.orig_shape # Dimensiones físicas de la foto
        
        detected_objects = []
        
        # 4. Iterar sobre cada objeto que la IA detectó
        for box in first_result.boxes:
            class_id = int(box.cls[0])          # ID de la clase
            class_name = model.names[class_id]  # Nombre (ej. "person", "chair")
            confidence = float(box.conf[0])     # Certeza (ej. 0.8954)
            
            # Guardamos el objeto en el formato estructurado que tu Frontend ya conoce
            detected_objects.append({
                "name": class_name,
                "confidence": round(confidence, 5)
            })
            
        # 5. Construir el paquete final de datos
        output = {
            "dimensions": [width, height],
            "detected_objects": detected_objects
        }
        
        # Imprimir en la consola de salida estándar para que Node.js lo capture
        print(json.dumps(output))

    except Exception as e:
        error_output = {
            "error": str(e),
            "dimensions": [0, 0],
            "detected_objects": []
        }
        print(json.dumps(error_output))

if __name__ == "__main__":
    # Recibir la ruta de la imagen desde los argumentos de la línea de comandos
    if len(sys.argv) > 1:
        run_inference(sys.argv[1])