package com.example.demo.dto;

public record YoutubeCategoryFilterRequest(
	Integer childId,
	String categoryId,
	Boolean enabled
) {
}
