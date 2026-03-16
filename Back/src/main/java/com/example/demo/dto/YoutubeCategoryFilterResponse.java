package com.example.demo.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record YoutubeCategoryFilterResponse(
	Integer childId,
	Map<String, Boolean> categorySettings,
	LocalDateTime updatedAt
) {
}
