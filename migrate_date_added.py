from app import app, db
from sqlalchemy import text
from datetime import datetime

# Create a context to work with the app
with app.app_context():
    print("Starting migration for adding date_added column to books table...")

    try:
        # Check if the column already exists
        check_column_sql = text("SHOW COLUMNS FROM books LIKE 'date_added'")
        result = db.session.execute(check_column_sql)
        column_exists = result.rowcount > 0

        if not column_exists:
            # Add the date_added column
            alter_sql = text(
                "ALTER TABLE books ADD COLUMN date_added DATETIME DEFAULT CURRENT_TIMESTAMP")
            db.session.execute(alter_sql)

            # Update existing records with current timestamp
            update_sql = text(
                "UPDATE books SET date_added = CURRENT_TIMESTAMP")
            db.session.execute(update_sql)

            db.session.commit()
            print(
                "Migration completed successfully! date_added column has been added to books table.")
        else:
            print("date_added column already exists in books table. No migration needed.")

    except Exception as e:
        db.session.rollback()
        print(f"Migration failed: {str(e)}")

    print("Migration script completed.")
