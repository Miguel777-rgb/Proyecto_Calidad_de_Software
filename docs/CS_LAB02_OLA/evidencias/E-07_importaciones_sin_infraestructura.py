"""Importa los modulos nuevos con SQLAlchemy, FastAPI, Starlette, psycopg y smtplib bloqueados."""
import importlib
import sys

BLOQUEADOS = {"sqlalchemy", "fastapi", "starlette", "psycopg"}


class Bloqueo:
    def find_spec(self, name, path=None, target=None):
        if name.split(".")[0] in BLOQUEADOS:
            raise ModuleNotFoundError(f"bloqueado: {name}", name=name)
        return None


sys.meta_path.insert(0, Bloqueo())
for m in ("ola.domain.notices", "ola.clock", "ola.services.notification_dispatcher", "ola.services.channels"):
    try:
        importlib.import_module(m)
        print(f"{m:40} OK sin {', '.join(sorted(BLOQUEADOS))}")
    except ModuleNotFoundError as e:
        print(f"{m:40} FALLA: requiere {e.name}")
externos = sorted({n.split('.')[0] for n in sys.modules} & {"pydantic", "pydantic_settings", "sqlalchemy", "fastapi"})
print("bibliotecas externas cargadas:", externos)
