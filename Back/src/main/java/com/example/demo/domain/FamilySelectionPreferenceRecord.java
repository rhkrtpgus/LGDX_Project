package com.example.demo.domain;

import java.time.LocalDateTime;

public class FamilySelectionPreferenceRecord {

	private Integer familyId;
	private Integer selectedChildId;
	private LocalDateTime updatedAt;

	public Integer getFamilyId() {
		return familyId;
	}

	public void setFamilyId(Integer familyId) {
		this.familyId = familyId;
	}

	public Integer getSelectedChildId() {
		return selectedChildId;
	}

	public void setSelectedChildId(Integer selectedChildId) {
		this.selectedChildId = selectedChildId;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}
}
