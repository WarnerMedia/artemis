from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ("artemisdb", "0049_auto_20240206_2045"),
    ]

    operations = [
        # Using "IS DISTINCT FROM" on ltree types in a trigger condition
        # causes failures when restoring a database dump via pg_restore, as
        # can happen when upgrading between major PostgreSQL server versions.
        # This is due to the "=" operator not being found during the restore:
        #   ERROR:  operator does not exist: public.ltree = public.ltree
        #
        # The workaround is to use OPERATOR, as suggested here:
        #   https://www.postgresql.org/message-id/CAKFQuwZsArqyJbcL5%2BH56hAV9nhHNxV2vFVeWq9H2NmVxq2XJQ%40mail.gmail.com
        migrations.RunSQL(
            sql="""
DROP TRIGGER IF EXISTS dependency_path_after_trg ON artemisdb_dependency;
CREATE TRIGGER dependency_path_after_trg
    AFTER UPDATE ON artemisdb_dependency
    FOR EACH ROW
    WHEN (NOT(NEW.path OPERATOR("public".=) OLD.path) AND
        (COALESCE(NEW.path, OLD.path) IS NOT NULL))
    EXECUTE PROCEDURE _update_descendants_dependency_path();
""",
            reverse_sql="""
DROP TRIGGER IF EXISTS dependency_path_after_trg ON artemisdb_dependency;
CREATE TRIGGER dependency_path_after_trg
    AFTER UPDATE ON artemisdb_dependency
    FOR EACH ROW
    WHEN (NEW.path IS DISTINCT FROM OLD.path)
    EXECUTE PROCEDURE _update_descendants_dependency_path();
"""
        )
    ]
