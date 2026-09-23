"""Genera el icono y la imagen de arranque de la app a partir del logotipo.

El logotipo de OLA es texto (Space Grotesk, 700, espaciado -0.035 em), asi que
los PNG se dibujan desde la fuente en lugar de exportarse a mano: cambiar el
color o el texto es cambiar una constante y volver a ejecutar.

    python scripts/generar-recursos.py        (requiere Pillow: pip install pillow)

Las fuentes salen de node_modules, asi que antes hay que instalar la app. Se
ejecuta en el equipo y no en Docker: en Windows pnpm enlaza node_modules con
uniones de directorio que apuntan a rutas de Windows, y un contenedor Linux
no puede seguirlas.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
RECURSOS = RAIZ / "assets"
FUENTES = RAIZ / "node_modules" / "@expo-google-fonts"
TITULO = FUENTES / "space-grotesk" / "700Bold" / "SpaceGrotesk_700Bold.ttf"
CUERPO = FUENTES / "inter" / "500Medium" / "Inter_500Medium.ttf"

ABISAL = (10, 37, 48, 255)
ESPUMA = (243, 247, 245, 255)
ESPUMA_TENUE = (169, 193, 196, 255)
TRANSPARENTE = (0, 0, 0, 0)

LOGOTIPO = "OLA"
# La banda de la web usa -0.035 em. Con ese valor la L y la A se tocan en
# cuanto el logotipo pasa de unos 60 px, asi que en icono y arranque se abre.
ESPACIADO_EM = -0.005
LEMA = "Datos abiertos del IMARPE"


def ancho_con_espaciado(fuente: ImageFont.FreeTypeFont, texto: str, espaciado: float) -> float:
    return sum(fuente.getlength(letra) for letra in texto) + espaciado * (len(texto) - 1)


def dibujar_texto(
    lienzo: Image.Image,
    texto: str,
    fuente: ImageFont.FreeTypeFont,
    color: tuple[int, int, int, int],
    centro_y: float,
    espaciado_em: float = 0.0,
) -> None:
    """Dibuja el texto centrado en horizontal, con su caja centrada en centro_y."""
    espaciado = espaciado_em * fuente.size
    ancho = ancho_con_espaciado(fuente, texto, espaciado)
    _, arriba, _, abajo = fuente.getbbox(texto)
    x = (lienzo.width - ancho) / 2
    y = centro_y - (arriba + abajo) / 2
    dibujo = ImageDraw.Draw(lienzo)
    for letra in texto:
        dibujo.text((x, y), letra, font=fuente, fill=color)
        x += fuente.getlength(letra) + espaciado


def fuente_para_ancho(ruta: Path, texto: str, ancho: float, espaciado_em: float = 0.0) -> ImageFont.FreeTypeFont:
    """El tamano mas grande con el que el texto cabe en `ancho` pixeles."""
    tamano = 10
    while True:
        prueba = ImageFont.truetype(str(ruta), tamano + 2)
        if ancho_con_espaciado(prueba, texto, espaciado_em * prueba.size) > ancho:
            return ImageFont.truetype(str(ruta), tamano)
        tamano += 2


def logotipo(lado: int, ancho: float, color: tuple[int, int, int, int], fondo: tuple[int, int, int, int]) -> Image.Image:
    lienzo = Image.new("RGBA", (lado, lado), fondo)
    fuente = fuente_para_ancho(TITULO, LOGOTIPO, ancho, ESPACIADO_EM)
    dibujar_texto(lienzo, LOGOTIPO, fuente, color, lado / 2, ESPACIADO_EM)
    return lienzo


def main() -> None:
    lado = 1024

    # Icono clasico (lanzadores antiguos y la ficha de la app): fondo abisal.
    logotipo(lado, lado * 0.62, ESPUMA, ABISAL).save(RECURSOS / "icon.png")

    # Icono adaptativo: el fondo lo pone el color abisal de la configuracion.
    # El frente ocupa 108 dp y solo el circulo central de 66 dp se ve con
    # cualquier mascara, asi que el logotipo se limita a ~48 % del lado.
    logotipo(lado, lado * 0.48, ESPUMA, TRANSPARENTE).save(RECURSOS / "android-icon-foreground.png")

    # Monocromo (iconos tematicos de Android 13+): el sistema lo tine, solo
    # cuenta la forma.
    logotipo(lado, lado * 0.48, (255, 255, 255, 255), TRANSPARENTE).save(
        RECURSOS / "android-icon-monochrome.png"
    )

    # Arranque: Android 12+ recorta el icono a un circulo, asi que el
    # logotipo y el lema caben dentro del circulo inscrito en el cuadrado.
    arranque = Image.new("RGBA", (lado, lado), TRANSPARENTE)
    titulo = fuente_para_ancho(TITULO, LOGOTIPO, lado * 0.56, ESPACIADO_EM)
    dibujar_texto(arranque, LOGOTIPO, titulo, ESPUMA, lado * 0.45, ESPACIADO_EM)
    lema = fuente_para_ancho(CUERPO, LEMA, lado * 0.62)
    dibujar_texto(arranque, LEMA, lema, ESPUMA_TENUE, lado * 0.66)
    arranque.save(RECURSOS / "splash-icon.png")

    for sobrante in ("android-icon-background.png", "favicon.png"):
        (RECURSOS / sobrante).unlink(missing_ok=True)
    print("Recursos generados en", RECURSOS)


if __name__ == "__main__":
    main()
