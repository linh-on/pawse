# Machine learning Text Classification model Test 1
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Load dataset
data = pd.read_csv("notifications.csv")
#use pandas library to read a CSV file

# Split into inputs and labels
X = data["text"] #this is the input which is the text
y = data["label"] #this is the correct answer

# Turn text into numbers since computers can't understand words directly
# Turn text into numbers since computers can't understand words directly
vectorizer = TfidfVectorizer()

X_vec = vectorizer.fit_transform(X)

# Train model
model = LogisticRegression()
model.fit(X_vec, y)
# Train model
model = LogisticRegression() #creates the machine learning model classifier it learns which text leads to which label
model.fit(X_vec, y)  #this is the actual learning step of the statistical patterns

print("Pawse model trained successfully.")
print("Type a notification to classify it.")
print("Type 'quit' to stop.\n")
#these are messages instructions for user so they know what step they are at

while True: #creates a loop that runs forever
    user_input = input("Enter notification: ") #input the notification sample

    if user_input.lower() == "quit":  #if want to stop system just type quit
        print("Exiting Pawse tester.")
        break #ig this is end for python

    user_vec = vectorizer.transform([user_input]) #convert new notification into numbers the same way
    prediction = model.predict(user_vec)[0] #ML model predicts urgent important ignore

    print("Prediction:", prediction)
    print()

    #problem right now model still quite dumb idk what to do yet