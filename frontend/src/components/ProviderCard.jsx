// frontend/src/components/ProviderCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import './ProviderCard.css';

const ProviderCard = ({ provider }) => {
    const navigate = useNavigate();

    return (
        <div className="provider-card" onClick={() => navigate(`/provider/${provider.id}`)}>
            <div className="provider-card-header">
                <h3>{provider.name}</h3>
                <span className="availability {provider.availability}">
                    {provider.availability}
                </span>
            </div>
            
            <p className="provider-service">{provider.service}</p>
            
            <div className="provider-rating">
                <StarRating 
                    rating={provider.rating || 0} 
                    totalReviews={provider.total_reviews || 0}
                    size={18}
                    showCount={true}
                />
            </div>
            
            <div className="provider-details">
                <span className="location">📍 {provider.location}</span>
                <span className="experience">💼 {provider.experience} years</span>
                <span className="price">💰 {provider.price || 'Contact for pricing'}</span>
            </div>
            
            <button className="view-profile-btn">View Profile</button>
        </div>
    );
};

export default ProviderCard;