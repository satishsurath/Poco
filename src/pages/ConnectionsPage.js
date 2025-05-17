import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import api from '../services/api';

const ConnectionsPage = () => {
  const [connections, setConnections] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    connection_string: '',
    schema: 'public'
  });

  // Fetch connections on component mount
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await api.get('/connections');
      setConnections(response.data);
    } catch (err) {
      setError('Failed to fetch connections');
      showSnackbar('Failed to fetch connections', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (connection = null) => {
    if (connection) {
      setEditingConnection(connection);
      setFormData({
        name: connection.name,
        connection_string: connection.connection_string,
        schema: connection.schema
      });
    } else {
      setEditingConnection(null);
      setFormData({
        name: '',
        connection_string: '',
        schema: 'public'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingConnection(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingConnection) {
        await api.put(`/connections/${editingConnection.id}`, formData);
        showSnackbar('Connection updated successfully', 'success');
      } else {
        await api.post('/connections', formData);
        showSnackbar('Connection created successfully', 'success');
      }
      fetchConnections();
      handleCloseDialog();
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'An error occurred', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      try {
        await api.delete(`/connections/${id}`);
        showSnackbar('Connection deleted successfully', 'success');
        fetchConnections();
      } catch (err) {
        showSnackbar('Failed to delete connection', 'error');
      }
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Database Connections</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Connection
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary" align="center">
              No connections found. Add your first database connection to get started.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {connections.map((connection) => (
            <Grid item xs={12} md={6} lg={4} key={connection.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {connection.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" noWrap>
                    {connection.connection_string}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Schema: {connection.schema}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(connection)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(connection.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingConnection ? 'Edit Connection' : 'Add New Connection'}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Connection Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleInputChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="connection_string"
              label="Connection String"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.connection_string}
              onChange={handleInputChange}
              placeholder="postgresql://username:password@localhost:5432/dbname"
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="schema"
              label="Schema"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.schema}
              onChange={handleInputChange}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" color="primary" variant="contained">
              {editingConnection ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ConnectionsPage;
