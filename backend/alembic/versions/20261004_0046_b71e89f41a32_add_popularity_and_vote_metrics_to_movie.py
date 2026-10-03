"""add_popularity_and_vote_metrics_to_movie

Revision ID: b71e89f41a32
Revises: 54cc21608f55
Create Date: 2026-10-04 00:46:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b71e89f41a32'
down_revision: Union[str, None] = '54cc21608f55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add popularity, vote_average, and vote_count columns to movie table
    op.add_column(
        'movie',
        sa.Column(
            'popularity',
            sa.Float(),
            nullable=True,
            comment='Upstream popularity metric supporting decimal values',
        ),
    )
    op.add_column(
        'movie',
        sa.Column(
            'vote_average',
            sa.Float(),
            nullable=True,
            comment='Upstream vote average rating supporting decimal values (0.0 - 10.0)',
        ),
    )
    op.add_column(
        'movie',
        sa.Column(
            'vote_count',
            sa.Integer(),
            nullable=True,
            comment='Upstream vote count supporting integer values',
        ),
    )

    # 2. Add indexes for efficient sorting, popularity fallback, and quality thresholding
    op.create_index(op.f('ix_movie_popularity'), 'movie', ['popularity'], unique=False)
    op.create_index(op.f('ix_movie_vote_average'), 'movie', ['vote_average'], unique=False)
    op.create_index(op.f('ix_movie_vote_count'), 'movie', ['vote_count'], unique=False)

    # 3. Add invariant check constraints
    op.create_check_constraint(
        'chk_movie_popularity_nonnegative',
        'movie',
        'popularity IS NULL OR popularity >= 0.0',
    )
    op.create_check_constraint(
        'chk_movie_vote_average_range',
        'movie',
        'vote_average IS NULL OR (vote_average >= 0.0 AND vote_average <= 10.0)',
    )
    op.create_check_constraint(
        'chk_movie_vote_count_nonnegative',
        'movie',
        'vote_count IS NULL OR vote_count >= 0',
    )


def downgrade() -> None:
    # 1. Drop check constraints
    op.drop_constraint('chk_movie_vote_count_nonnegative', 'movie', type_='check')
    op.drop_constraint('chk_movie_vote_average_range', 'movie', type_='check')
    op.drop_constraint('chk_movie_popularity_nonnegative', 'movie', type_='check')

    # 2. Drop indexes
    op.drop_index(op.f('ix_movie_vote_count'), table_name='movie')
    op.drop_index(op.f('ix_movie_vote_average'), table_name='movie')
    op.drop_index(op.f('ix_movie_popularity'), table_name='movie')

    # 3. Drop columns
    op.drop_column('movie', 'vote_count')
    op.drop_column('movie', 'vote_average')
    op.drop_column('movie', 'popularity')
