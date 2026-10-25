from __future__ import annotations


def vendedor_display_name(user) -> str:
    if not user or not getattr(user, "is_authenticated", False):
        return "Vendedor"
    name = (getattr(user, "full_name", "") or "").strip()
    if name:
        return name
    email = (getattr(user, "email", "") or "").strip()
    if email:
        return email.split("@")[0]
    return "Vendedor"
