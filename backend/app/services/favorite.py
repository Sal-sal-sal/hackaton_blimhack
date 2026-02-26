from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.favorite import Favorite
from app.schemas.favorite import FavoriteCreate


async def add_favorite(session: AsyncSession, user_id: int, data: FavoriteCreate) -> Favorite:
    stmt = (
        pg_insert(Favorite)
        .values(user_id=user_id, **data.model_dump())
        .on_conflict_do_nothing(constraint="uq_fav_user_vacancy")
    )
    await session.execute(stmt)
    await session.commit()

    # Fetch and return the row (either newly inserted or existing)
    result = await session.execute(
        select(Favorite).where(
            Favorite.user_id == user_id,
            Favorite.vacancy_id == data.vacancy_id,
            Favorite.source == data.source,
        )
    )
    return result.scalar_one()


async def get_favorites(session: AsyncSession, user_id: int) -> list[Favorite]:
    result = await session.execute(
        select(Favorite)
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_favorite(session: AsyncSession, user_id: int, favorite_id: int) -> bool:
    result = await session.execute(
        delete(Favorite).where(
            Favorite.id == favorite_id,
            Favorite.user_id == user_id,
        )
    )
    await session.commit()
    return result.rowcount > 0


async def get_favorites_for_ai(session: AsyncSession, user_id: int) -> str:
    favorites = await get_favorites(session, user_id)
    if not favorites:
        return ""

    blocks: list[str] = []
    for i, fav in enumerate(favorites, 1):
        parts = [f"Liked Vacancy {i}: {fav.title}"]
        if fav.subtitle:
            parts[0] += f" at {fav.subtitle}"
        if fav.salary:
            parts.append(f"Salary: {fav.salary}")
        if fav.tags:
            parts.append(f"Skills: {', '.join(fav.tags)}")
        if fav.location:
            parts.append(f"Location: {fav.location}")
        blocks.append("\n".join(parts))

    return "\n---\n".join(blocks)
