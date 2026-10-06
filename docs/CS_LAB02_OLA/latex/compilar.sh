#!/bin/sh
# Compila los cuatro entregables de la Práctica 02 con TeX Live en Docker.
# Uso, desde esta carpeta:  sh compilar.sh
# Deja los cuatro PDF en ../entregables/ (el informe y el cuestionario también en ../).
set -e
cd "$(dirname "$0")"
BUILD="$(mktemp -d)"
latex() {
    docker run --rm --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD/..":/practica -v "$BUILD":/build \
        -w /practica/latex texlive/texlive:latest \
        pdflatex -interaction=nonstopmode -halt-on-error -output-directory=/build "$1" > "$BUILD/consola.txt" \
        || { tail -40 "$BUILD/consola.txt"; exit 1; }
}
latex tabla3.tex && cp "$BUILD/tabla3.pdf" tabla3.pdf
for doc in informe diagramas_codigo matriz_adr cuestionario; do
    for pasada in 1 2 3; do latex "$doc.tex"; done
done
mkdir -p ../entregables
cp "$BUILD/informe.pdf" ../CS_LAB02_Informe_OLA.pdf
cp "$BUILD/cuestionario.pdf" ../CS_LAB02_Cuestionario_OLA.pdf
cp "$BUILD/informe.pdf" ../entregables/CS_LAB02_Informe_OLA.pdf
cp "$BUILD/diagramas_codigo.pdf" ../entregables/CS_LAB02_Diagrama_UML_y_Codigo_OLA.pdf
cp "$BUILD/matriz_adr.pdf" ../entregables/CS_LAB02_Matriz_Hallazgos_y_ADR_OLA.pdf
cp "$BUILD/cuestionario.pdf" ../entregables/CS_LAB02_Cuestionario_OLA.pdf
grep -hiE "warning[: (]|Overfull" "$BUILD"/informe.log "$BUILD"/diagramas_codigo.log "$BUILD"/matriz_adr.log "$BUILD"/cuestionario.log || echo "Sin avisos ni cajas desbordadas."
rm -rf "$BUILD"
echo "Listo: ../entregables/"
