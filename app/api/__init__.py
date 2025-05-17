from flask import Blueprint, request, jsonify
from ..models import Connection, Backup
from ..extensions import db
import os
from datetime import datetime
import json

api_bp = Blueprint('api', __name__)

@api_bp.route('/connections', methods=['GET'])
def get_connections():
    connections = Connection.query.filter_by(is_active=True).all()
    return jsonify([conn.to_dict() for conn in connections])

@api_bp.route('/connections', methods=['POST'])
def create_connection():
    data = request.get_json()
    
    # Validate required fields
    if not all(k in data for k in ['name', 'connection_string']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Check if connection with this name already exists
    if Connection.query.filter_by(name=data['name']).first():
        return jsonify({'error': 'Connection with this name already exists'}), 400
    
    # Create new connection
    connection = Connection(
        name=data['name'],
        connection_string=data['connection_string'],
        schema=data.get('schema', 'public')
    )
    
    db.session.add(connection)
    db.session.commit()
    
    return jsonify(connection.to_dict()), 201

@api_bp.route('/connections/<int:connection_id>', methods=['GET'])
def get_connection(connection_id):
    connection = Connection.query.get_or_404(connection_id)
    return jsonify(connection.to_dict())

@api_bp.route('/connections/<int:connection_id>', methods=['PUT'])
def update_connection(connection_id):
    connection = Connection.query.get_or_404(connection_id)
    data = request.get_json()
    
    # Update fields if provided
    if 'name' in data:
        connection.name = data['name']
    if 'connection_string' in data:
        connection.connection_string = data['connection_string']
    if 'schema' in data:
        connection.schema = data['schema']
    
    connection.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify(connection.to_dict())

@api_bp.route('/connections/<int:connection_id>', methods=['DELETE'])
def delete_connection(connection_id):
    connection = Connection.query.get_or_404(connection_id)
    connection.is_active = False
    db.session.commit()
    return jsonify({'message': 'Connection deleted successfully'})

@api_bp.route('/connections/<int:connection_id>/tables', methods=['GET'])
def get_tables(connection_id):
    connection = Connection.query.get_or_404(connection_id)
    # This is a simplified example - in a real app, you'd connect to the database
    # and fetch the list of tables using SQLAlchemy or psycopg2
    return jsonify({'tables': []})  # Placeholder

@api_bp.route('/backups', methods=['GET'])
def get_backups():
    backups = Backup.query.all()
    return jsonify([backup.to_dict() for backup in backups])

@api_bp.route('/backups', methods=['POST'])
def create_backup():
    data = request.get_json()
    connection_id = data.get('connection_id')
    
    if not connection_id:
        return jsonify({'error': 'connection_id is required'}), 400
    
    # In a real app, this would use pg_dump to create the backup
    # For now, we'll just create a record
    backup = Backup(
        connection_id=connection_id,
        filename=f'backup_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.sql',
        filepath=f'/backups/backup_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.sql',
        size_mb=0.0
    )
    
    db.session.add(backup)
    db.session.commit()
    
    return jsonify(backup.to_dict()), 201
