"""Catalogo de los 10 laboratorios costeros del IMARPE (RF-04).

El CSV de ATSM no incluye coordenadas, pero el mapa las necesita. Se listan
aqui, ordenadas de norte a sur, y se cargan mediante una migracion de datos
para que el equipo pueda afinarlas despues sin tocar el codigo.

Las ubicaciones corresponden al puerto o caleta de cada laboratorio y son
aproximadas: sirven para situar la zona en el mapa, no para navegar.

MATARANI aparece en el catalogo aunque su ultimo dato sea de 2016: RF-04 exige
mostrar las 10 zonas. Su estado de "sin datos recientes" se deduce de la fecha
del dato, no de una excepcion por nombre.
"""

from __future__ import annotations

from typing import NamedTuple


class LaboratorySeed(NamedTuple):
    code: str
    name: str
    latitude: str
    longitude: str


LABORATORIES: tuple[LaboratorySeed, ...] = (
    LaboratorySeed("TUMBES", "Tumbes", "-3.566900", "-80.451500"),
    LaboratorySeed("PAITA", "Paita", "-5.089200", "-81.114400"),
    LaboratorySeed("SAN JOSE", "San José", "-6.771400", "-79.963900"),
    LaboratorySeed("CHICAMA", "Chicama", "-7.698900", "-79.438600"),
    LaboratorySeed("CHIMBOTE", "Chimbote", "-9.074500", "-78.593600"),
    LaboratorySeed("HUACHO", "Huacho", "-11.106700", "-77.605300"),
    LaboratorySeed("CALLAO", "Callao", "-12.050800", "-77.142800"),
    LaboratorySeed("PISCO", "Pisco", "-13.710000", "-76.203600"),
    LaboratorySeed("MATARANI", "Matarani", "-17.000000", "-72.106900"),
    LaboratorySeed("ILO", "Ilo", "-17.639400", "-71.337500"),
)

LABORATORY_CODES: frozenset[str] = frozenset(lab.code for lab in LABORATORIES)
