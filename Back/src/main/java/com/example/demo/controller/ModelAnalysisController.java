package com.example.demo.controller;

import com.example.demo.dto.AnalysisRequest;
import com.example.demo.dto.AnalysisResponse;
import com.example.demo.service.ModelAnalysisService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analysis")
public class ModelAnalysisController {

	private final ModelAnalysisService modelAnalysisService;

	public ModelAnalysisController(ModelAnalysisService modelAnalysisService) {
		this.modelAnalysisService = modelAnalysisService;
	}

	@PostMapping("/youtube")
	public AnalysisResponse analyzeYoutube(@RequestBody AnalysisRequest request) {
		return modelAnalysisService.analyzeYoutubeVideo(request.videoUrl());
	}

	@GetMapping("/history")
	public List<AnalysisResponse> getHistory(
		@RequestParam(defaultValue = "5") int limit
	) {
		return modelAnalysisService.findRecentHistory(limit);
	}
}
