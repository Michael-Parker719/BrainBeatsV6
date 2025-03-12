import React from 'react';
import './ConfirmationModal.css';
interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null; // Don't render the modal if it's not open

  return (
    <div className='overlay'>
      <div className='modal'>
        <h3>{message}</h3>
        <div className='buttonContainer'>
          <button onClick={onConfirm} className='button'>Yes</button>
          <button onClick={onCancel} className='button'>No</button>
        </div>
      </div>
    </div>
  );
};


export default ConfirmationModal;
