#!/bin/sh
# Compila el informe y el cuestionario de la Práctica 02 con TeX Live en Docker.
# Uso, desde esta carpeta:  sh compilar.sh
# Deja CS_LAB02_Informe_OLA.pdf y CS_LAB02_Cuestionario_OLA.pdf en la carpeta de la práctica.
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
for pasada in 1 2 3; do latex informe.tex; done
for pasada in 1 2; do latex cuestionario.tex; done
cp "$BUILD/informe.pdf" ../CS_LAB02_Informe_OLA.pdf
cp "$BUILD/cuestionario.pdf" ../CS_LAB02_Cuestionario_OLA.pdf
grep -hiE "warning[: (]|Overfull" "$BUILD/informe.log" "$BUILD/cuestionario.log" || echo "Sin avisos ni cajas desbordadas."
rm -rf "$BUILD"
echo "Listo: ../CS_LAB02_Informe_OLA.pdf y ../CS_LAB02_Cuestionario_OLA.pdf"
