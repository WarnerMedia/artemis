import django.db.models.deletion
from django.db import migrations, models

import artemisdb.artemisdb.fields.ltree


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0035_alter_scanbatch_created_by"),
    ]

    operations = [
        # Drop the Dependency model so that we can recreate it with the BigAutoField as PK. We decided that since
        # the Dependency model is only used to generate SBOM reports and SBOM reports are only available through the
        # UI right now that this was a safe way to migrate the structure of this table.
        migrations.RunSQL(
            # Do this as raw SQL instead of using migrations.DeleteModel() because the backwards migration to recreate
            # this table is complicated due to all the trigger and constraint stuff.
            sql="DROP TABLE artemisdb_dependency CASCADE;",
            reverse_sql="""
--
-- THIS IS THE RELEVANT SQL TO REGENERATE THE DEPENDENCY TABLE AS IT WAS FROM MIGRATION 0025
--
--
--
-- Create model Dependency
--
CREATE TABLE "artemisdb_dependency" (
    "id" serial NOT NULL PRIMARY KEY,
    "label" varchar(256) NOT NULL,
    "path" ltree NULL,
    "source" varchar(4096) NULL,
    "component_id" integer NOT NULL,
    "parent_id" integer NULL,
    "scan_id" integer NOT NULL);
--
-- Raw SQL operation
--
CREATE INDEX artemisdb_dependency_dependency_path ON artemisdb_dependency USING btree(path);
--
-- Raw SQL operation
--
CREATE INDEX artemisdb_dependency_path_gist ON artemisdb_dependency USING GIST(path);
--
-- Raw SQL operation
--
ALTER TABLE artemisdb_dependency ADD CONSTRAINT check_no_recursion CHECK(
    index(path, label::text::ltree) = (nlevel(path) - 1));
--
-- Raw SQL operation
--

CREATE OR REPLACE FUNCTION _update_dependency_path() RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = NEW.label::ltree;
    ELSE
        SELECT path || NEW.label
          FROM artemisdb_dependency
         WHERE NEW.parent_id IS NULL or id = NEW.parent_id
          INTO NEW.path;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
;
--
-- Raw SQL operation
--

CREATE OR REPLACE FUNCTION _update_descendants_dependency_path() RETURNS TRIGGER AS
$$
BEGIN
    UPDATE artemisdb_dependency
       SET path = NEW.path || subpath(artemisdb_dependency.path, nlevel(OLD.path))
     WHERE artemisdb_dependency.path <@ OLD.path AND id != NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
;
--
-- Raw SQL operation
--

DROP TRIGGER IF EXISTS dependency_path_insert_trg ON artemisdb_dependency;
CREATE TRIGGER dependency_path_insert_trg
               BEFORE INSERT ON artemisdb_dependency
               FOR EACH ROW
               EXECUTE PROCEDURE _update_dependency_path();
;
--
-- Raw SQL operation
--

DROP TRIGGER IF EXISTS dependency_path_update_trg ON artemisdb_dependency;
CREATE TRIGGER dependency_path_update_trg
               BEFORE UPDATE ON artemisdb_dependency
               FOR EACH ROW
               WHEN (OLD.parent_id IS DISTINCT FROM NEW.parent_id
                     OR OLD.label IS DISTINCT FROM NEW.label)
               EXECUTE PROCEDURE _update_dependency_path();
;
--
-- Raw SQL operation
--

DROP TRIGGER IF EXISTS dependency_path_after_trg ON artemisdb_dependency;
CREATE TRIGGER dependency_path_after_trg
               AFTER UPDATE ON artemisdb_dependency
               FOR EACH ROW
               WHEN (NEW.path IS DISTINCT FROM OLD.path)
               EXECUTE PROCEDURE _update_descendants_dependency_path();
;
ALTER TABLE "artemisdb_dependency" ADD CONSTRAINT "artemisdb_dependenc_component_id_0aaa9cf7_fk_analyzerd"
    FOREIGN KEY ("component_id") REFERENCES "artemisdb_component" ("id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "artemisdb_dependency" ADD CONSTRAINT "artemisdb_dependenc_parent_id_85808c42_fk_analyzerd"
    FOREIGN KEY ("parent_id") REFERENCES "artemisdb_dependency" ("id") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "artemisdb_dependency" ADD CONSTRAINT "artemisdb_dependency_scan_id_744dde25_fk_artemisdb_scan_id"
    FOREIGN KEY ("scan_id") REFERENCES "artemisdb_scan" ("id") DEFERRABLE INITIALLY DEFERRED;
CREATE INDEX "artemisdb_dependency_component_id_0aaa9cf7" ON "artemisdb_dependency" ("component_id");
CREATE INDEX "artemisdb_dependency_parent_id_85808c42" ON "artemisdb_dependency" ("parent_id");
CREATE INDEX "artemisdb_dependency_scan_id_744dde25" ON "artemisdb_dependency" ("scan_id");
""",
        ),
        # Recreate the Dependency model. This is a copy of the Dependency part of migration 0025_auto_20211029_1059
        # but with BigAutoField for the PK.
        migrations.CreateModel(
            name="Dependency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("label", models.CharField(max_length=256)),
                ("path", artemisdb.artemisdb.fields.ltree.LtreeField(default=None, editable=False, null=True)),
                ("source", models.CharField(max_length=4096, null=True)),
                (
                    "component",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.component"),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="children",
                        to="artemisdb.dependency",
                    ),
                ),
                ("scan", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.scan")),
            ],
        ),
        # The SQL below is modified from the examples at:
        # https://github.com/peopledoc/django-ltree-demo/blob/master/demo/categories/sql/
        #
        # Used when we access the path directly
        migrations.RunSQL(
            sql="CREATE INDEX artemisdb_dependency_dependency_path ON artemisdb_dependency USING btree(path);",
            reverse_sql=migrations.RunSQL.noop,  # Index will drop when the table is dropped
        ),
        # Used when we access the path directly
        migrations.RunSQL(
            sql="CREATE INDEX artemisdb_dependency_path_gist ON artemisdb_dependency USING GIST(path);",
            reverse_sql=migrations.RunSQL.noop,  # Index will drop when the table is dropped
        ),
        # Make sure we cannot have a path where one of the ancestor is the row itself
        # (this would cause an infinite recursion)
        migrations.RunSQL(
            sql="ALTER TABLE artemisdb_dependency ADD CONSTRAINT check_no_recursion "
            "CHECK(index(path, label::text::ltree) = (nlevel(path) - 1));",
            reverse_sql=migrations.RunSQL.noop,  # Constraint will drop when the table is dropped
        ),
        # Function to calculate the path of any given dependency
        migrations.RunSQL(
            sql="""
CREATE OR REPLACE FUNCTION _update_dependency_path() RETURNS TRIGGER AS
$$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = NEW.label::ltree;
    ELSE
        SELECT path || NEW.label
          FROM artemisdb_dependency
         WHERE NEW.parent_id IS NULL or id = NEW.parent_id
          INTO NEW.path;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
""",
            reverse_sql="DROP FUNCTION IF EXISTS _update_dependency_path;",
        ),
        # function to update the path of the descendants of a dependency
        migrations.RunSQL(
            sql="""
CREATE OR REPLACE FUNCTION _update_descendants_dependency_path() RETURNS TRIGGER AS
$$
BEGIN
    UPDATE artemisdb_dependency
       SET path = NEW.path || subpath(artemisdb_dependency.path, nlevel(OLD.path))
     WHERE artemisdb_dependency.path <@ OLD.path AND id != NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
""",
            reverse_sql="DROP FUNCTION IF EXISTS _update_descendants_dependency_path;",
        ),
        # Calculate the path every time we insert a new dependency
        migrations.RunSQL(
            sql="""
DROP TRIGGER IF EXISTS dependency_path_insert_trg ON artemisdb_dependency;
CREATE TRIGGER dependency_path_insert_trg
               BEFORE INSERT ON artemisdb_dependency
               FOR EACH ROW
               EXECUTE PROCEDURE _update_dependency_path();
""",
            reverse_sql="DROP TRIGGER IF EXISTS dependency_path_insert_trg ON artemisdb_dependency;",
        ),
        # Calculate the path when updating the parent or the name
        migrations.RunSQL(
            sql="""
DROP TRIGGER IF EXISTS dependency_path_update_trg ON artemisdb_dependency;
CREATE TRIGGER dependency_path_update_trg
               BEFORE UPDATE ON artemisdb_dependency
               FOR EACH ROW
               WHEN (OLD.parent_id IS DISTINCT FROM NEW.parent_id
                     OR OLD.label IS DISTINCT FROM NEW.label)
               EXECUTE PROCEDURE _update_dependency_path();
""",
            reverse_sql="DROP TRIGGER IF EXISTS dependency_path_update_trg ON artemisdb_dependency;",
        ),
        # If the path was updated, update the path of the descendants
        migrations.RunSQL(
            sql="""
DROP TRIGGER IF EXISTS dependency_path_after_trg ON artemisdb_dependency;
CREATE TRIGGER dependency_path_after_trg
               AFTER UPDATE ON artemisdb_dependency
               FOR EACH ROW
               WHEN (NEW.path IS DISTINCT FROM OLD.path)
               EXECUTE PROCEDURE _update_descendants_dependency_path();
""",
            reverse_sql="DROP TRIGGER IF EXISTS dependency_path_after_trg ON artemisdb_dependency;",
        ),
    ]
