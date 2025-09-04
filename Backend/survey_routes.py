"""
Protected survey routes with user ownership
"""
from flask import Blueprint, request, jsonify, g
from auth_middleware import requireAuth, requireAdmin, optionalAuth
from mongodb_config import db
from bson import ObjectId
from datetime import datetime
import json
from utils.short_id import generate_short_id, is_valid_short_id

survey_bp = Blueprint('surveys', __name__, url_prefix='/api/surveys')

def convert_objectid_to_string(doc):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if isinstance(doc, dict):
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                doc[key] = str(value)
            elif isinstance(value, dict):
                convert_objectid_to_string(value)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        convert_objectid_to_string(item)
    return doc

@survey_bp.route('/', methods=['GET'])
@requireAuth
def get_user_surveys():
    """Get surveys for the current user (My Surveys)"""
    try:
        user = g.current_user
        user_id = str(user['_id'])
        
        # Admin can see all surveys, regular users only see their own
        if user.get('role') == 'admin':
            surveys = list(db.surveys.find().sort('created_at', -1))
            print(f"Admin {user.get('email')} viewing all surveys: {len(surveys)}")
        else:
            # Enhanced query to find user's surveys using multiple identification methods
            query = {
                '$or': [
                    {'ownerUserId': user_id},
                    {'user_id': user_id},
                    {'creator_email': user.get('email', '')},
                    {'created_by.user_id': user_id},
                    {'created_by.email': user.get('email', '')}
                ]
            }
            surveys = list(db.surveys.find(query).sort('created_at', -1))
            print(f"User {user.get('email')} ({user_id}) found {len(surveys)} surveys")
            
            # Debug: Show what fields each survey has for troubleshooting
            for survey in surveys[:3]:  # Show first 3 surveys
                fields = []
                if survey.get('ownerUserId'): fields.append('ownerUserId')
                if survey.get('user_id'): fields.append('user_id')
                if survey.get('creator_email'): fields.append('creator_email')
                if survey.get('created_by'): fields.append('created_by')
                prompt = survey.get('prompt', 'No prompt')[:30] + '...'
                print(f"  - Survey: {prompt} | Fields: {', '.join(fields)}")
        
        # Convert ObjectIds to strings
        for survey in surveys:
            convert_objectid_to_string(survey)
        
        return jsonify({
            'surveys': surveys,
            'total': len(surveys),
            'user_role': user.get('role'),
            'user_info': {
                'id': user_id,
                'email': user.get('email'),
                'simple_id': user.get('simpleUserId')
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get surveys: {str(e)}'}), 500

@survey_bp.route('/', methods=['POST'])
@requireAuth
def create_survey():
    """Create a new survey"""
    try:
        user = g.current_user
        data = request.json
        
        if not data:
            return jsonify({'error': 'Survey data is required'}), 400
        
        # Generate short ID for the survey
        short_id = generate_short_id()
        
        # Create survey document
        survey_doc = {
            'short_id': short_id,
            'ownerUserId': str(user['_id']),  # Link to user
            'title': data.get('title', 'Untitled Survey'),
            'description': data.get('description', ''),
            'questions': data.get('questions', []),
            'settings': data.get('settings', {}),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'status': 'draft'
        }
        
        # Insert survey
        result = db.surveys.insert_one(survey_doc)
        survey_doc['_id'] = str(result.inserted_id)
        
        return jsonify({
            'message': 'Survey created successfully',
            'survey': survey_doc
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Failed to create survey: {str(e)}'}), 500

@survey_bp.route('/<survey_id>', methods=['GET'])
@optionalAuth
def get_survey(survey_id):
    """Get a specific survey"""
    try:
        # Try to find by short_id first, then by ObjectId
        if is_valid_short_id(survey_id):
            survey = db.surveys.find_one({'short_id': survey_id})
        else:
            try:
                survey = db.surveys.find_one({'_id': ObjectId(survey_id)})
            except:
                return jsonify({'error': 'Invalid survey ID'}), 400
        
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        
        # Check ownership for private surveys
        user = g.current_user
        if user:
            # User is logged in - check ownership or admin access
            user_id = str(user['_id'])
            if survey.get('ownerUserId') != user_id and user.get('role') != 'admin':
                # Check if survey is public
                if survey.get('settings', {}).get('public', False) != True:
                    return jsonify({'error': 'Access denied'}), 403
        else:
            # User not logged in - only allow public surveys
            if survey.get('settings', {}).get('public', False) != True:
                return jsonify({'error': 'Authentication required'}), 401
        
        convert_objectid_to_string(survey)
        return jsonify({'survey': survey})
        
    except Exception as e:
        return jsonify({'error': f'Failed to get survey: {str(e)}'}), 500

@survey_bp.route('/<survey_id>', methods=['PUT'])
@requireAuth
def update_survey(survey_id):
    """Update a survey"""
    try:
        user = g.current_user
        data = request.json
        
        if not data:
            return jsonify({'error': 'Survey data is required'}), 400
        
        # Find survey
        if is_valid_short_id(survey_id):
            survey = db.surveys.find_one({'short_id': survey_id})
        else:
            try:
                survey = db.surveys.find_one({'_id': ObjectId(survey_id)})
            except:
                return jsonify({'error': 'Invalid survey ID'}), 400
        
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        
        # Check ownership
        user_id = str(user['_id'])
        if survey.get('ownerUserId') != user_id and user.get('role') != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Update survey
        update_data = {
            'title': data.get('title', survey.get('title')),
            'description': data.get('description', survey.get('description')),
            'questions': data.get('questions', survey.get('questions')),
            'settings': data.get('settings', survey.get('settings')),
            'updated_at': datetime.utcnow()
        }
        
        # Update status if provided
        if 'status' in data:
            update_data['status'] = data['status']
        
        db.surveys.update_one(
            {'_id': survey['_id']},
            {'$set': update_data}
        )
        
        # Get updated survey
        updated_survey = db.surveys.find_one({'_id': survey['_id']})
        convert_objectid_to_string(updated_survey)
        
        return jsonify({
            'message': 'Survey updated successfully',
            'survey': updated_survey
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to update survey: {str(e)}'}), 500

@survey_bp.route('/<survey_id>', methods=['DELETE'])
@requireAuth
def delete_survey(survey_id):
    """Delete a survey"""
    try:
        user = g.current_user
        
        # Find survey
        if is_valid_short_id(survey_id):
            survey = db.surveys.find_one({'short_id': survey_id})
        else:
            try:
                survey = db.surveys.find_one({'_id': ObjectId(survey_id)})
            except:
                return jsonify({'error': 'Invalid survey ID'}), 400
        
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        
        # Check ownership
        user_id = str(user['_id'])
        if survey.get('ownerUserId') != user_id and user.get('role') != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Delete survey and its responses
        db.surveys.delete_one({'_id': survey['_id']})
        db.responses.delete_many({'survey_id': str(survey['_id'])})
        
        return jsonify({'message': 'Survey deleted successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Failed to delete survey: {str(e)}'}), 500

@survey_bp.route('/<survey_id>/responses', methods=['GET'])
@requireAuth
def get_survey_responses(survey_id):
    """Get responses for a survey"""
    try:
        user = g.current_user
        
        # Find survey
        if is_valid_short_id(survey_id):
            survey = db.surveys.find_one({'short_id': survey_id})
        else:
            try:
                survey = db.surveys.find_one({'_id': ObjectId(survey_id)})
            except:
                return jsonify({'error': 'Invalid survey ID'}), 400
        
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        
        # Check ownership
        user_id = str(user['_id'])
        if survey.get('ownerUserId') != user_id and user.get('role') != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        # Get responses
        responses = list(db.responses.find({
            'survey_id': str(survey['_id'])
        }).sort('submitted_at', -1))
        
        # Convert ObjectIds to strings
        for response in responses:
            convert_objectid_to_string(response)
        
        return jsonify({
            'responses': responses,
            'total': len(responses)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get responses: {str(e)}'}), 500

@survey_bp.route('/public', methods=['GET'])
def get_public_surveys():
    """Get public surveys (no authentication required)"""
    try:
        surveys = list(db.surveys.find({
            'settings.public': True,
            'status': 'published'
        }).sort('created_at', -1))
        
        # Convert ObjectIds to strings and remove sensitive data
        for survey in surveys:
            convert_objectid_to_string(survey)
            # Remove owner info for public listing
            survey.pop('ownerUserId', None)
        
        return jsonify({
            'surveys': surveys,
            'total': len(surveys)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get public surveys: {str(e)}'}), 500

# Admin-only routes
@survey_bp.route('/admin/all', methods=['GET'])
@requireAdmin
def get_all_surveys_admin():
    """Admin: Get all surveys with owner information"""
    try:
        # Get all surveys with owner info
        pipeline = [
            {
                '$lookup': {
                    'from': 'users',
                    'localField': 'ownerUserId',
                    'foreignField': '_id',
                    'as': 'owner'
                }
            },
            {
                '$unwind': {
                    'path': '$owner',
                    'preserveNullAndEmptyArrays': True
                }
            },
            {
                '$sort': {'created_at': -1}
            }
        ]
        
        surveys = list(db.surveys.aggregate(pipeline))
        
        # Convert ObjectIds to strings
        for survey in surveys:
            convert_objectid_to_string(survey)
        
        return jsonify({
            'surveys': surveys,
            'total': len(surveys)
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get surveys: {str(e)}'}), 500

@survey_bp.route('/admin/users/<user_id>/surveys', methods=['GET'])
@requireAdmin
def get_user_surveys_admin(user_id):
    """Admin: Get surveys for a specific user"""
    try:
        surveys = list(db.surveys.find({
            'ownerUserId': user_id
        }).sort('created_at', -1))
        
        # Convert ObjectIds to strings
        for survey in surveys:
            convert_objectid_to_string(survey)
        
        return jsonify({
            'surveys': surveys,
            'total': len(surveys),
            'user_id': user_id
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to get user surveys: {str(e)}'}), 500
