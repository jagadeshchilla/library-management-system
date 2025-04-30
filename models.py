from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Book(db.Model):
    __tablename__ = 'books'
    ISBN = db.Column(db.String(20), primary_key=True)
    Book_Title = db.Column(db.String(255), nullable=False)
    Book_Author = db.Column(db.String(255), nullable=False)
    Year_Of_Publication = db.Column(db.Integer)
    Publisher = db.Column(db.String(255))
    Image_URL_S = db.Column(db.String(255))
    Image_URL_M = db.Column(db.String(255))
    Image_URL_L = db.Column(db.String(255))
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
