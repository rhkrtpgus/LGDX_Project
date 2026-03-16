package com.example.demo.dto;

import java.time.LocalDateTime;

public record FamilySelectionPreferenceResponse(
	int familyId,
	Integer selectedChildId,
	LocalDateTime updatedAt
) {
}
