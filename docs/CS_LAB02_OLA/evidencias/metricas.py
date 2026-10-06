"""Métricas de diseño por módulo para la Práctica de Laboratorio 02 (proyecto OLA).

Uso:
    python metricas.py <ruta a backend/src> <módulo> [<módulo> ...]

Ejemplo:
    python metricas.py backend/src ola.services.notification_service ola.clock

Solo usa la biblioteca estándar. Definiciones:

- LOC: líneas que no están en blanco, no son comentarios y no forman parte de
  una cadena de documentación (docstring).
- NOM: funciones del módulo más métodos de sus clases (no cuenta funciones
  anidadas).
- Ce (acoplamiento eferente): módulos internos (paquete ``ola``) que el módulo
  importa.
- Ca (acoplamiento aferente): módulos internos de producción que importan al
  módulo. Las pruebas no cuentan.
- I (inestabilidad): Ce / (Ca + Ce); 0 si ambos son 0.
- CCmáx y CCsum: complejidad ciclomática máxima y acumulada de las funciones y
  métodos del módulo, con el mismo algoritmo que la regla C901 de ruff (McCabe):
  1 + if/elif + for/while + cada except + else de try + match/case.
"""

from __future__ import annotations

import ast
import sys
from pathlib import Path

PAQUETE = "ola"


def nombre_de_modulo(raiz: Path, ruta: Path) -> str:
    partes = list(ruta.relative_to(raiz).with_suffix("").parts)
    if partes[-1] == "__init__":
        partes = partes[:-1]
    return ".".join(partes)


def resolver(modulo: str, modulos: dict[str, Path]) -> str:
    while modulo and modulo not in modulos:
        modulo = modulo.rsplit(".", 1)[0] if "." in modulo else ""
    return modulo


def importaciones_internas(arbol: ast.AST, nombre: str, modulos: dict[str, Path]) -> set[str]:
    deps: set[str] = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, ast.Import):
            for alias in nodo.names:
                if alias.name.startswith(PAQUETE + "."):
                    deps.add(resolver(alias.name, modulos))
        elif isinstance(nodo, ast.ImportFrom):
            base = nodo.module or ""
            if nodo.level:
                prefijo = nombre.split(".")[: -nodo.level]
                base = ".".join(prefijo + ([base] if base else []))
            if not base.startswith(PAQUETE):
                continue
            for alias in nodo.names:
                candidato = f"{base}.{alias.name}"
                deps.add(candidato if candidato in modulos else resolver(base, modulos))
    deps.discard(nombre)
    return {d for d in deps if d}


def complejidad(sentencias: list[ast.stmt]) -> int:
    total = 0
    for s in sentencias:
        if isinstance(s, ast.If):
            total += 1 + complejidad(s.body)
            resto = s.orelse
            while len(resto) == 1 and isinstance(resto[0], ast.If):  # elif
                total += 1 + complejidad(resto[0].body)
                resto = resto[0].orelse
            total += complejidad(resto)
        elif isinstance(s, (ast.For, ast.AsyncFor, ast.While)):
            total += 1 + complejidad(s.body) + complejidad(s.orelse)
        elif isinstance(s, (ast.With, ast.AsyncWith)):
            total += complejidad(s.body)
        elif isinstance(s, ast.Match):
            for caso in s.cases:
                total += 1 + complejidad(caso.body)
        elif isinstance(s, ast.Try):
            total += complejidad(s.body) + complejidad(s.orelse) + complejidad(s.finalbody)
            total += 1 if s.orelse else 0
            for manejador in s.handlers:
                total += 1 + complejidad(manejador.body)
        elif isinstance(s, (ast.FunctionDef, ast.AsyncFunctionDef)):
            total += 1 + complejidad(s.body)
        elif isinstance(s, ast.ClassDef):
            total += complejidad(s.body)
    return total


def funciones(arbol: ast.Module) -> list[tuple[str, ast.FunctionDef | ast.AsyncFunctionDef]]:
    encontradas: list[tuple[str, ast.FunctionDef | ast.AsyncFunctionDef]] = []
    for nodo in arbol.body:
        if isinstance(nodo, (ast.FunctionDef, ast.AsyncFunctionDef)):
            encontradas.append((nodo.name, nodo))
        elif isinstance(nodo, ast.ClassDef):
            for sub in nodo.body:
                if isinstance(sub, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    encontradas.append((f"{nodo.name}.{sub.name}", sub))
    return encontradas


def loc(texto: str, arbol: ast.Module) -> int:
    lineas_doc: set[int] = set()
    for nodo in ast.walk(arbol):
        if isinstance(nodo, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            cuerpo = nodo.body
            if (
                cuerpo
                and isinstance(cuerpo[0], ast.Expr)
                and isinstance(cuerpo[0].value, ast.Constant)
                and isinstance(cuerpo[0].value.value, str)
            ):
                fin = cuerpo[0].end_lineno or cuerpo[0].lineno
                lineas_doc.update(range(cuerpo[0].lineno, fin + 1))
    return sum(
        1
        for numero, linea in enumerate(texto.splitlines(), 1)
        if linea.strip() and not linea.strip().startswith("#") and numero not in lineas_doc
    )


def main() -> None:
    raiz = Path(sys.argv[1])
    pedidos = sys.argv[2:]
    modulos = {nombre_de_modulo(raiz, p): p for p in sorted((raiz / PAQUETE).rglob("*.py"))}
    arboles = {n: ast.parse(p.read_text(encoding="utf-8")) for n, p in modulos.items()}
    ce = {n: importaciones_internas(a, n, modulos) for n, a in arboles.items()}
    ca: dict[str, set[str]] = {n: set() for n in modulos}
    for origen, destinos in ce.items():
        for destino in destinos:
            ca[destino].add(origen)

    cabecera = f"{'Módulo':42} {'LOC':>5} {'NOM':>4} {'Ce':>3} {'Ca':>3} {'I':>5} {'CCmáx':>6} {'CCsum':>6}"
    print(cabecera)
    print("-" * len(cabecera))
    total_loc = total_nom = total_cc = 0
    for nombre in pedidos:
        if nombre not in modulos:
            print(f"{nombre:42} (no existe en esta versión)")
            continue
        arbol = arboles[nombre]
        complejidades = [complejidad(f.body) + 1 for _, f in funciones(arbol)]
        n_loc = loc(modulos[nombre].read_text(encoding="utf-8"), arbol)
        n_nom = len(complejidades)
        e, a = len(ce[nombre]), len(ca[nombre])
        inestabilidad = e / (a + e) if a + e else 0.0
        cc_max, cc_sum = max(complejidades, default=0), sum(complejidades)
        total_loc, total_nom, total_cc = total_loc + n_loc, total_nom + n_nom, total_cc + cc_sum
        nombre_corto = nombre.removeprefix(PAQUETE + ".")
        print(
            f"{nombre_corto:42} {n_loc:5} {n_nom:4} {e:3} {a:3} {inestabilidad:5.2f}"
            f" {cc_max:6} {cc_sum:6}"
        )
    print("-" * len(cabecera))
    print(f"{'Total':42} {total_loc:5} {total_nom:4} {'':3} {'':3} {'':5} {'':6} {total_cc:6}")
    print()
    for nombre in pedidos:
        if nombre in modulos:
            print(f"{nombre}\n  Ce -> {', '.join(sorted(ce[nombre])) or '(ninguno)'}")
            print(f"  Ca <- {', '.join(sorted(ca[nombre])) or '(ninguno)'}")


if __name__ == "__main__":
    main()
