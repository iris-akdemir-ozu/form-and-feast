# Form & Feast

An AI-powered preventive health system combining computer vision biomechanics analysis, agentic nutrition, and longitudinal training memory — built on Amazon Nova.

## What it does
- **Nova Pro** analyzes your workout video and detects form issues, injury risk, and muscle activation
- **Nova Lite** generates whole-food recovery meals scaled to your session volume with carbon footprint scoring
- **RAG memory** tracks your training history in DynamoDB to auto-regulate today's intensity and detect chronic injury patterns

## Stack
- Amazon Nova Pro + Nova Lite via Amazon Bedrock
- Amazon S3 (video storage)
- Amazon DynamoDB (session memory)
- FastAPI + React

## Setup

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## AWS Requirements
- Bedrock access in `eu-north-1` with Nova Pro and Nova Lite enabled
- S3 bucket: `form-and-feast-videos`
- DynamoDB tables: `FormAndFeastSets` and `FormAndFeastSessions`

## Built for
Amazon Nova AI Hackathon 2025
