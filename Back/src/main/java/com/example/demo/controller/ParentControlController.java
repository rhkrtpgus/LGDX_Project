package com.example.demo.controller;

import com.example.demo.dto.ChildWatchPolicyRequest;
import com.example.demo.dto.ChildWatchPolicyResponse;
import com.example.demo.dto.FamilySelectionPreferenceRequest;
import com.example.demo.dto.FamilySelectionPreferenceResponse;
import com.example.demo.dto.ParentAlertResponse;
import com.example.demo.dto.ParentChildResponse;
import com.example.demo.dto.ParentOverviewResponse;
import com.example.demo.dto.ParentViewingHistoryResponse;
import com.example.demo.dto.PlaybackRecordRequest;
import com.example.demo.dto.PlaybackRecordResponse;
import com.example.demo.dto.YoutubeCategoryFilterRequest;
import com.example.demo.dto.YoutubeCategoryFilterResponse;
import com.example.demo.service.FamilySelectionPreferenceService;
import com.example.demo.service.ParentControlService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/parent")
public class ParentControlController {

	private final ParentControlService parentControlService;
	private final FamilySelectionPreferenceService familySelectionPreferenceService;

	public ParentControlController(
		ParentControlService parentControlService,
		FamilySelectionPreferenceService familySelectionPreferenceService
	) {
		this.parentControlService = parentControlService;
		this.familySelectionPreferenceService = familySelectionPreferenceService;
	}

	@GetMapping("/overview")
	public ParentOverviewResponse getOverview(@RequestParam(defaultValue = "1") int familyId) {
		try {
			return parentControlService.getOverview(familyId);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@GetMapping("/children")
	public List<ParentChildResponse> getChildren(@RequestParam(defaultValue = "1") int familyId) {
		return parentControlService.getChildren(familyId);
	}

	@GetMapping("/selection")
	public FamilySelectionPreferenceResponse getSelection(
		@RequestParam(defaultValue = "1") int familyId
	) {
		try {
			return familySelectionPreferenceService.getPreference(familyId);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@PatchMapping("/selection")
	public FamilySelectionPreferenceResponse updateSelection(
		@RequestBody FamilySelectionPreferenceRequest request
	) {
		try {
			return familySelectionPreferenceService.updatePreference(request);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@GetMapping("/watch-policy")
	public ChildWatchPolicyResponse getWatchPolicy(@RequestParam int childId) {
		try {
			return parentControlService.getWatchPolicy(childId);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@PatchMapping("/watch-policy")
	public ChildWatchPolicyResponse updateWatchPolicy(@RequestBody ChildWatchPolicyRequest request) {
		try {
			return parentControlService.updateWatchPolicy(request);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@GetMapping("/youtube-category-filter")
	public YoutubeCategoryFilterResponse getYoutubeCategoryFilter(@RequestParam int childId) {
		try {
			return parentControlService.getYoutubeCategoryFilter(childId);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@PatchMapping("/youtube-category-filter")
	public YoutubeCategoryFilterResponse updateYoutubeCategoryFilter(
		@RequestBody YoutubeCategoryFilterRequest request
	) {
		try {
			return parentControlService.updateYoutubeCategoryFilter(request);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@PostMapping("/playback-record")
	public PlaybackRecordResponse recordPlayback(@RequestBody PlaybackRecordRequest request) {
		try {
			return parentControlService.recordPlaybackFromAnalysis(request);
		} catch (IllegalArgumentException exception) {
			throw new ResponseStatusException(BAD_REQUEST, exception.getMessage(), exception);
		}
	}

	@GetMapping("/viewing-history")
	public List<ParentViewingHistoryResponse> getViewingHistory(
		@RequestParam(defaultValue = "1") int familyId,
		@RequestParam(required = false) Integer childId,
		@RequestParam(defaultValue = "12") int limit
	) {
		return parentControlService.getViewingHistory(familyId, childId, limit);
	}

	@GetMapping("/alerts")
	public List<ParentAlertResponse> getAlerts(
		@RequestParam(defaultValue = "1") int familyId,
		@RequestParam(defaultValue = "12") int limit
	) {
		return parentControlService.getAlerts(familyId, limit);
	}
}
