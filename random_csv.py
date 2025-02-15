import random
import string

# Function to generate random names and emails
def generate_random_data(num_entries):
    data = []
    for i in range(num_entries):
        name = ''.join(random.choices(string.ascii_lowercase, k=8))
        email = f"{name}{random.randint(1, 100)}@example.com"
        data.append(f"{name},{email}")
    return data

# Generate 1000 random entries
random_data = generate_random_data(1000)

# Save to CSV format
csv_content = "\n".join(["name,email"] + random_data)

# Write to a CSV file
with open("random_csv.csv", "w") as file:
    file.write(csv_content)

print("random_csv.csv has been created successfully.")
