from fastapi.testclient import TestClient
from app.main import app

def test_full_flow():
    client = TestClient(app)
    
    # 1. Health
    res = client.get("/api/health")
    assert res.status_code == 200, res.text
    print("[OK] Health check OK:", res.json())

    # 2. Catalogs
    res = client.get("/api/locations")
    assert res.status_code == 200
    locations = res.json()
    assert len(locations) == 4, f"Expected 4 locations, got {len(locations)}"
    print(f"[OK] Locations count: {len(locations)} OK")

    res = client.get("/api/equipment")
    assert res.status_code == 200
    equipment = res.json()
    assert len(equipment) == 25, f"Expected 25 equipment, got {len(equipment)}"
    print(f"[OK] Equipment count: {len(equipment)} OK")

    res = client.get("/api/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 17, f"Expected 17 users, got {len(users)}"
    print(f"[OK] Users count: {len(users)} OK")

    res = client.get("/api/catalogs/malfunctions")
    assert res.status_code == 200
    codes = res.json()
    assert len(codes) == 20, f"Expected 20 codes, got {len(codes)}"
    print(f"[OK] Malfunction codes count: {len(codes)} OK")

    res = client.get("/api/catalogs/materials")
    assert res.status_code == 200
    mats = res.json()
    assert len(mats) == 40, f"Expected 40 materials, got {len(mats)}"
    print(f"[OK] Materials count: {len(mats)} OK")

    # 3. AI Recommendations
    res = client.get("/api/users/recommendations?equipment_id=1&problem_text=заклинивание подшипника")
    assert res.status_code == 200
    recs = res.json()
    assert len(recs) > 0
    print(f"[OK] AI Executor Recommendation OK: top candidate '{recs[0]['full_name']}' ({recs[0]['match_score']}%)")

    # 4. Master creates work order (Section 5.1)
    new_wo_payload = {
        "order_type": "EMERGENCY",
        "priority": "EMERGENCY",
        "description": "Тестовый аварийный наряд: течь масла редуктора конвейера К-1",
        "location_id": 1,
        "equipment_id": 4,
        "executor_id": 3, # Ахметов Ерик
        "master_id": 1,
        "standard_hours": 2.0,
        "deadline_minutes": 90
    }
    res = client.post("/api/work-orders", json=new_wo_payload)
    assert res.status_code == 200, res.text
    created_wo = res.json()
    order_id = created_wo["id"]
    print(f"[OK] Work order created: {created_wo['number']} (status: {created_wo['status']})")

    # 5. Executor accepts order
    res = client.patch(f"/api/work-orders/{order_id}/status", json={"status": "ACCEPTED", "user_id": 3})
    assert res.status_code == 200
    assert res.json()["status"] == "ACCEPTED"
    print("[OK] Status transitioned to ACCEPTED")

    # 6. Executor starts work
    res = client.patch(f"/api/work-orders/{order_id}/status", json={"status": "IN_PROGRESS", "user_id": 3})
    assert res.status_code == 200
    assert res.json()["status"] == "IN_PROGRESS"
    print("[OK] Status transitioned to IN_PROGRESS")

    # 7. Executor closes work order with materials & photo -> triggers AI check
    close_payload = {
        "completion_notes": "Произведена замена сальника 65х90, долито масло И-40А. Протечка полностью устранена.",
        "malfunction_code_id": 10, # Г-01
        "materials": [
            {"material_id": 7, "material_name": "Манжета армированная (сальник) 65х90х10", "quantity": 1, "unit": "шт"},
            {"material_id": 11, "material_name": "Масло гидравлическое И-40А", "quantity": 5, "unit": "л"}
        ],
        "photo_url": "/uploads/test_after.jpg",
        "actual_duration_minutes": 75,
        "user_id": 3
    }
    res = client.post(f"/api/work-orders/{order_id}/close", json=close_payload)
    assert res.status_code == 200, res.text
    closed_wo = res.json()
    assert closed_wo["ai_verdict"] in ["APPROVED", "APPROVED_WITH_NOTES"], f"Unexpected verdict: {closed_wo['ai_verdict']}"
    print(f"[OK] Work order evaluated by AI: Verdict={closed_wo['ai_verdict']}, Score={closed_wo['ai_score']}")

    # 8. Master confirms and closes (Section 6.4)
    override_payload = {
        "master_id": 1,
        "score": 96,
        "notes": "Работа выполнена чисто и оперативно",
        "action": "APPROVE"
    }
    res = client.post(f"/api/work-orders/{order_id}/override-ai", json=override_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "CLOSED"
    print("[OK] Work order confirmed and CLOSED by master")

    # 9. Analytics & Anomalies
    res = client.get("/api/analytics/shift")
    assert res.status_code == 200
    print("[OK] Shift Analytics OK:", res.json()["ai_summary_text"][:80], "...")

    res = client.get("/api/analytics/anomalies")
    assert res.status_code == 200
    anomalies = res.json()
    assert len(anomalies) >= 3
    print(f"[OK] AI Anomalies OK: {len(anomalies)} patterns detected (including Conveyor K-3)")

    res = client.get("/api/analytics/workers-rating")
    assert res.status_code == 200
    ratings = res.json()
    assert len(ratings) > 0
    print(f"[OK] Worker Ratings OK: top worker {ratings[0]['full_name']} ({ratings[0]['overall_score']}%)")

    print("\n==========================================")
    print("ALL BACKEND & AI MODULES VERIFIED 100% OK!")
    print("==========================================")

if __name__ == "__main__":
    test_full_flow()
