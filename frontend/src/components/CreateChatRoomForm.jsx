import { useState } from 'react';
import { chatRoomAPI } from '../utils/axiosConfig';
import './CreateChatRoomForm.css';

const CreateChatRoomForm = ({ onRoomCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public',
    maxMembers: 100,
    allowInvites: true,
    requireApproval: false,
    allowFileSharing: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { name, description, type, maxMembers, allowInvites, requireApproval, allowFileSharing } = formData;

  const validateForm = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Room name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Room name must be at least 3 characters';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Room name cannot exceed 50 characters';
    }

    if (description.length > 200) {
      newErrors.description = 'Description cannot exceed 200 characters';
    }

    if (maxMembers < 2 || maxMembers > 1000) {
      newErrors.maxMembers = 'Max members must be between 2 and 1000';
    }

    return newErrors;
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await chatRoomAPI.createChatRoom({
        name: name.trim(),
        description: description.trim(),
        type,
        maxMembers: parseInt(maxMembers),
        settings: {
          allowInvites,
          requireApproval,
          allowFileSharing
        }
      });

      if (onRoomCreated) {
        onRoomCreated(response.data.chatRoom);
      }
    } catch (error) {
      console.error('Create room error:', error);
      
      if (error.response?.data?.errors) {
        const serverErrors = {};
        error.response.data.errors.forEach(err => {
          serverErrors[err.path || 'general'] = err.msg;
        });
        setErrors(serverErrors);
      } else {
        setErrors({
          general: error.response?.data?.message || 'Failed to create chat room'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-room-overlay">
      <div className="create-room-modal">
        <div className="create-room-header">
          <h2>Create New Chat Room</h2>
          <button 
            className="close-button" 
            onClick={onCancel}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {errors.general && (
          <div className="error-message">
            {errors.general}
          </div>
        )}

        <form onSubmit={onSubmit} className="create-room-form">
          <div className="form-group">
            <label htmlFor="name">Room Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={onChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter room name"
              disabled={loading}
              maxLength={50}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={onChange}
              className={errors.description ? 'error' : ''}
              placeholder="Describe your chat room (optional)"
              disabled={loading}
              maxLength={200}
              rows={3}
            />
            <div className="char-count">{description.length}/200</div>
            {errors.description && <span className="field-error">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Room Type</label>
              <select
                id="type"
                name="type"
                value={type}
                onChange={onChange}
                disabled={loading}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="maxMembers">Max Members</label>
              <input
                type="number"
                id="maxMembers"
                name="maxMembers"
                value={maxMembers}
                onChange={onChange}
                className={errors.maxMembers ? 'error' : ''}
                min={2}
                max={1000}
                disabled={loading}
              />
              {errors.maxMembers && <span className="field-error">{errors.maxMembers}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="section-label">Room Settings</label>
            
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="allowInvites"
                  checked={allowInvites}
                  onChange={onChange}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                Allow members to invite others
              </label>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="requireApproval"
                  checked={requireApproval}
                  onChange={onChange}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                Require approval to join
              </label>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="allowFileSharing"
                  checked={allowFileSharing}
                  onChange={onChange}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                Allow file sharing
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChatRoomForm;
