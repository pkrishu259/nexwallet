import re
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline

# Training dataset for Student Spending Categorization
TRAINING_DATA = [
    # Food & Canteen
    ("Campus Canteen Chai & Samosa", "Food"),
    ("Swiggy Order Biryani", "Food"),
    ("Zomato Delivery Pizza", "Food"),
    ("Starbucks Coffee Mocha", "Food"),
    ("Dominos Pizza", "Food"),
    ("Mess Monthly Fee", "Food"),
    ("McDonalds Burger Meal", "Food"),
    ("Grocery Supermarket Maggi Snacks", "Food"),
    ("Amul Ice Cream Parlour", "Food"),
    ("Chai Point Tea Snacks", "Food"),

    # Shopping
    ("Amazon India College Supplies Notebooks", "Shopping"),
    ("Flipkart Wireless Earbuds", "Shopping"),
    ("Myntra T-Shirt Sneakers", "Shopping"),
    ("Zudio College Wear Clothes", "Shopping"),
    ("Decathlon Gym Shoes", "Shopping"),
    ("Zara Jeans", "Shopping"),
    ("Fastrack Watch Bag", "Shopping"),

    # Subscriptions
    ("Spotify Premium Student Plan", "Subscriptions"),
    ("Netflix Monthly Standard", "Subscriptions"),
    ("YouTube Premium Student", "Subscriptions"),
    ("Prime Video Amazon", "Subscriptions"),
    ("ChatGPT Plus OpenAI", "Subscriptions"),
    ("Coursera Monthly Pass", "Subscriptions"),
    ("Duolingo Super Subscription", "Subscriptions"),

    # Travel & Transport
    ("Uber Auto Campus to Metro", "Travel"),
    ("Ola Cab Railway Station", "Travel"),
    ("IRCTC Train Ticket Home", "Travel"),
    ("Metro Smart Card Recharge", "Travel"),
    ("Rapido Bike Taxi Shuttle", "Travel"),
    ("MakeMyTrip Flight Weekend Trip", "Travel"),
    ("Petrol Pump Scooter Refill", "Travel"),

    # Education & Books
    ("College Library Fine Books", "Education"),
    ("Udemy Web Dev Course", "Education"),
    ("Stationery Shop Xerox Printouts", "Education"),
    ("Semester Exam Registration Fee", "Education"),
    ("Notion Pro Subscription", "Education"),
    ("Lab Kit & Components", "Education"),

    # Entertainment
    ("BookMyShow Movie Tickets IMAX", "Entertainment"),
    ("Steam Game Purchase", "Entertainment"),
    ("Valorant In-Game Points", "Entertainment"),
    ("Concert Pass Music Fest", "Entertainment"),
    ("Bowling Alley Arcade Game", "Entertainment"),

    # Utilities & Bills
    ("Hostel Wi-Fi Broadband Bill", "Utilities"),
    ("Airtel Mobile Recharge 84 Days", "Utilities"),
    ("Jio Prepaid Unlimited Data", "Utilities"),
    ("Hostel Electricity Meter Bill", "Utilities"),

    # Transfers
    ("Sent to Friend UPI Split", "Transfers"),
    ("Paid Back Hostel Roommate", "Transfers"),
    ("Rent Contribution", "Transfers"),
]

class SpendingCategorizer:
    def __init__(self):
        texts = [item[0] for item in TRAINING_DATA]
        labels = [item[1] for item in TRAINING_DATA]
        
        self.model = make_pipeline(
            TfidfVectorizer(ngram_range=(1, 2), lowercase=True),
            MultinomialNB(alpha=0.1)
        )
        self.model.fit(texts, labels)
        self.categories = list(set(labels))

    def predict(self, merchant_or_desc: str):
        if not merchant_or_desc or not merchant_or_desc.strip():
            return {"category": "Other", "confidence": 0.50}

        cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', merchant_or_desc)
        probs = self.model.predict_proba([cleaned])[0]
        max_idx = np.argmax(probs)
        confidence = float(probs[max_idx])
        predicted_cat = str(self.model.classes_[max_idx])

        if confidence < 0.25:
            # Fallback keyword matching
            low_text = merchant_or_desc.lower()
            if any(k in low_text for k in ["food", "swiggy", "zomato", "canteen", "cafe", "chai"]):
                predicted_cat = "Food"
            elif any(k in low_text for k in ["uber", "ola", "metro", "irctc", "travel", "auto"]):
                predicted_cat = "Travel"
            elif any(k in low_text for k in ["spotify", "netflix", "youtube", "sub"]):
                predicted_cat = "Subscriptions"
            elif any(k in low_text for k in ["amazon", "flipkart", "shop", "myntra"]):
                predicted_cat = "Shopping"
            elif any(k in low_text for k in ["recharge", "wifi", "bill", "electricity"]):
                predicted_cat = "Utilities"
            else:
                predicted_cat = "Other"
            confidence = 0.65

        return {
            "category": predicted_cat,
            "confidence": round(confidence, 2)
        }

class OverspendingPredictor:
    def predict_spending(self, current_day: int, days_in_month: int, spent_so_far: float, monthly_budget: float, recent_transactions: list):
        if current_day <= 0:
            current_day = 1
        
        daily_average = spent_so_far / current_day
        predicted_end_of_month = round(daily_average * days_in_month, 2)
        variance = round(predicted_end_of_month - monthly_budget, 2)
        
        is_overspending = predicted_end_of_month > monthly_budget
        risk_percentage = min(100.0, round((predicted_end_of_month / max(monthly_budget, 1.0)) * 100, 1))

        if risk_percentage > 90:
            risk_level = "HIGH"
        elif risk_percentage > 75:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # AI advice generation
        advice = []
        if is_overspending:
            advice.append(f"⚠️ At your current rate (₹{round(daily_average, 1)}/day), you will exceed your ₹{monthly_budget} monthly budget by ₹{variance} by month-end.")
            advice.append("💡 Student Tip: Limit food delivery to weekends and utilize hostel mess/canteen for weekday meals.")
            advice.append("🎯 Recommendation: Lock ₹500 into your Savings Goal now to prevent impulse spending.")
        else:
            advice.append(f"🟢 Great job! You are projected to finish the month with ₹{round(monthly_budget - predicted_end_of_month, 2)} remaining.")
            advice.append("💡 Pro Tip: Sweep surplus funds into your High-Yield Savings Stash to earn 6.5% p.a. repo interest.")

        return {
            "current_day": current_day,
            "days_in_month": days_in_month,
            "spent_so_far": spent_so_far,
            "monthly_budget": monthly_budget,
            "daily_average": round(daily_average, 2),
            "predicted_end_of_month": predicted_end_of_month,
            "variance": variance,
            "is_overspending": is_overspending,
            "risk_percentage": risk_percentage,
            "risk_level": risk_level,
            "ai_advice": advice
        }

# Global instances
categorizer = SpendingCategorizer()
predictor = OverspendingPredictor()
