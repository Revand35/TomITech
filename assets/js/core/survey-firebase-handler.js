// survey-firebase-handler.js - Handle Survey Submissions to Firebase
import { db } from '../../../config/firebase-init.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

console.log('Survey handler loaded');

// Initialize survey form handler
document.addEventListener('DOMContentLoaded', () => {
    const surveyForm = document.getElementById('survey-form');
    if (surveyForm) {
        console.log('Survey form found, attaching handler');
        surveyForm.addEventListener('submit', handleSurveySubmit);
    } else {
        console.warn('Survey form not found');
    }
});

async function handleSurveySubmit(e) {
    e.preventDefault();
    
    console.log('Survey form submitted');
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Mengirim...';
    submitBtn.disabled = true;

    try {
        // Get user data from localStorage
        const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        console.log('User data:', userData);
        
        if (!userData.email) {
            alert('Anda harus login untuk mengirim feedback.');
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            return;
        }

        // Collect form data
        const formData = new FormData(e.target);
        
        // Validate all required fields are filled
        const requiredFields = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 
                               'device', 'frequency', 'mostUsedFeature', 'purpose'];
        
        for (const field of requiredFields) {
            if (!formData.get(field)) {
                alert(`Mohon lengkapi semua pertanyaan yang wajib diisi`);
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                return;
            }
        }
        
        const surveyData = {
            // User information
            userId: userData.uid || 'anonymous',
            userEmail: userData.email,
            userName: userData.displayName || userData.email || 'Anonymous',
            
            // Rating questions (1-10)
            ratings: {
                textReadability: parseInt(formData.get('q1')),
                colorLayout: parseInt(formData.get('q2')),
                attractiveDesign: parseInt(formData.get('q3')),
                crossPlatform: parseInt(formData.get('q4')),
                easeOfUse: parseInt(formData.get('q5')),
                chatbotRelevance: parseInt(formData.get('q6')),
                mediaSupport: parseInt(formData.get('q7')),
                materialClarity: parseInt(formData.get('q8')),
                questionVariety: parseInt(formData.get('q9')),
                learningSupport: parseInt(formData.get('q10'))
            },
            
            // Usage information
            device: formData.get('device'),
            frequency: formData.get('frequency'),
            mostUsedFeature: formData.get('mostUsedFeature'),
            purpose: formData.get('purpose'),
            
            // Additional feedback
            additionalFeedback: document.getElementById('additionalFeedback')?.value.trim() || '',
            
            // Metadata
            timestamp: new Date().toISOString(),
            createdAt: serverTimestamp(),
            status: 'new'
        };

        // Calculate average rating
        const ratingValues = Object.values(surveyData.ratings);
        surveyData.averageRating = parseFloat((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(2));

        console.log('Survey data to save:', surveyData);

        // Save to Firestore
        const surveyRef = collection(db, 'surveyResponses');
        const docRef = await addDoc(surveyRef, surveyData);

        console.log('Survey saved with ID:', docRef.id);

        // Show success message
        const successMessage = document.getElementById('success-message');
        if (successMessage) {
            successMessage.classList.remove('hidden');
            
            // Reset form
            e.target.reset();
            
            // Scroll to top to show message
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Hide success message after 5 seconds
            setTimeout(() => {
                successMessage.classList.add('hidden');
            }, 5000);
        } else {
            alert('Terima kasih! Survey berhasil dikirim.');
            e.target.reset();
        }

        console.log('Survey submitted successfully');

    } catch (error) {
        console.error('Error submitting survey:', error);
        alert('Gagal mengirim feedback. Silakan coba lagi.\n\nError: ' + error.message);
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Export for testing
export { handleSurveySubmit };