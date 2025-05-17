from ..extensions import db
from datetime import datetime

class Backup(db.Model):
    """Model to store backup information"""
    id = db.Column(db.Integer, primary_key=True)
    connection_id = db.Column(db.Integer, db.ForeignKey('connection.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    size_mb = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    connection = db.relationship('Connection', backref=db.backref('backups', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'connection_id': self.connection_id,
            'filename': self.filename,
            'filepath': self.filepath,
            'size_mb': self.size_mb,
            'created_at': self.created_at.isoformat(),
            'connection_name': self.connection.name if self.connection else None
        }
