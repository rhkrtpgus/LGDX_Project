package com.example.demo.dto;

public record FamilySelectionPreferenceRequest(
	Integer familyId,
	Integer selectedChildId
) {
}
