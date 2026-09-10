"""Pruebas de hash de contrasenas y tokens (RF-07)."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from ola.security import (
    BCRYPT_MAX_BYTES,
    PasswordTooLongError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

# 32 bytes o mas: por debajo PyJWT advierte y produccion lo rechaza.
SECRETO = "secreto-de-prueba-suficientemente-largo-1234"
ALGORITMO = "HS256"


class TestHashDeContrasenas:
    def test_el_hash_nunca_contiene_la_contrasena_en_claro(self):
        # La SRS exige, en el atributo de Seguridad, que nunca se almacene
        # la contrasena en texto plano.
        assert "miclave123" not in hash_password("miclave123")

    def test_la_contrasena_correcta_se_verifica(self):
        assert verify_password("miclave123", hash_password("miclave123")) is True

    def test_la_contrasena_incorrecta_se_rechaza(self):
        assert verify_password("otraclave", hash_password("miclave123")) is False

    def test_dos_hashes_de_la_misma_clave_son_distintos(self):
        # bcrypt usa una sal aleatoria: dos usuarios con la misma clave no
        # deben compartir hash.
        assert hash_password("miclave123") != hash_password("miclave123")

    def test_rechaza_contrasenas_que_bcrypt_truncaria(self):
        # Sin este limite, dos claves distintas que comparten los primeros
        # 72 bytes darian el mismo hash y ambas abririan la cuenta.
        with pytest.raises(PasswordTooLongError):
            hash_password("a" * (BCRYPT_MAX_BYTES + 1))

    def test_cuenta_bytes_y_no_caracteres(self):
        # Cada 'ñ' ocupa 2 bytes en UTF-8: 40 caracteres son 80 bytes.
        with pytest.raises(PasswordTooLongError):
            hash_password("ñ" * 40)

    def test_un_hash_con_formato_invalido_no_revienta(self):
        assert verify_password("miclave123", "esto-no-es-un-hash") is False


class TestTokens:
    def _token(self, **kwargs):
        return create_access_token(
            "42", secret=SECRETO, algorithm=ALGORITMO, expires_minutes=60, **kwargs
        )

    def test_el_token_identifica_al_usuario(self):
        datos = decode_access_token(self._token(), secret=SECRETO, algorithm=ALGORITMO)
        assert datos["sub"] == "42"

    def test_el_token_puede_llevar_datos_adicionales(self):
        token = self._token(extra_claims={"role": "admin", "email": "a@ola.pe"})
        datos = decode_access_token(token, secret=SECRETO, algorithm=ALGORITMO)
        assert datos["role"] == "admin"
        assert datos["email"] == "a@ola.pe"

    def test_un_token_firmado_con_otro_secreto_se_rechaza(self):
        with pytest.raises(jwt.InvalidSignatureError):
            decode_access_token(
                self._token(),
                secret="secreto-distinto-igualmente-largo-abcdefgh",
                algorithm=ALGORITMO,
            )

    def test_un_token_vencido_se_rechaza(self):
        vencido = create_access_token(
            "42",
            secret=SECRETO,
            algorithm=ALGORITMO,
            expires_minutes=60,
            now=datetime.now(UTC) - timedelta(hours=2),
        )
        with pytest.raises(jwt.ExpiredSignatureError):
            decode_access_token(vencido, secret=SECRETO, algorithm=ALGORITMO)

    def test_un_texto_cualquiera_no_es_un_token(self):
        with pytest.raises(jwt.PyJWTError):
            decode_access_token("no.es.un.token", secret=SECRETO, algorithm=ALGORITMO)
