from uuid import UUID

from sqlalchemy import String, Table, UniqueConstraint
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.schema import CreateTable
from sqlalchemy.sql.schema import CallableColumnDefault

from app.core.models import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Example(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "example"
    __table_args__ = (UniqueConstraint("isbn"),)
    isbn: Mapped[str] = mapped_column(String(13))


def _example_table() -> Table:
    table = Example.__table__
    assert isinstance(table, Table)
    return table


EXAMPLE_TABLE = _example_table()
Base.metadata.remove(EXAMPLE_TABLE)


def _ddl() -> str:
    dialect = postgresql.dialect()  # type: ignore[no-untyped-call]
    return str(CreateTable(EXAMPLE_TABLE).compile(dialect=dialect))


def test_mixins_add_uuid_id_and_utc_timestamps() -> None:
    ddl = _ddl()
    assert "id UUID NOT NULL" in ddl
    assert "created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL" in ddl
    assert "updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL" in ddl


def test_constraints_follow_the_naming_convention() -> None:
    ddl = _ddl()
    assert "CONSTRAINT pk_example PRIMARY KEY (id)" in ddl
    assert "CONSTRAINT uq_example_isbn UNIQUE (isbn)" in ddl


def test_ids_default_to_uuid7() -> None:
    default = EXAMPLE_TABLE.c.id.default
    assert isinstance(default, CallableColumnDefault)
    value = default.arg(None)  # type: ignore[arg-type]
    assert isinstance(value, UUID)
    assert value.version == 7
