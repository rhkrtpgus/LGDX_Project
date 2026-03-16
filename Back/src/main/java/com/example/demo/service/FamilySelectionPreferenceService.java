package com.example.demo.service;

import com.example.demo.domain.ChildProfile;
import com.example.demo.domain.FamilySelectionPreferenceRecord;
import com.example.demo.dto.FamilySelectionPreferenceRequest;
import com.example.demo.dto.FamilySelectionPreferenceResponse;
import com.example.demo.repository.FamilySelectionPreferenceMapper;
import com.example.demo.repository.ParentControlMapper;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class FamilySelectionPreferenceService {

	private final FamilySelectionPreferenceMapper familySelectionPreferenceMapper;
	private final ParentControlMapper parentControlMapper;

	public FamilySelectionPreferenceService(
		FamilySelectionPreferenceMapper familySelectionPreferenceMapper,
		ParentControlMapper parentControlMapper
	) {
		this.familySelectionPreferenceMapper = familySelectionPreferenceMapper;
		this.parentControlMapper = parentControlMapper;
	}

	public FamilySelectionPreferenceResponse getPreference(int familyId) {
		validateFamily(familyId);

		FamilySelectionPreferenceRecord record = familySelectionPreferenceMapper.findByFamilyId(familyId);
		if (record == null) {
			return new FamilySelectionPreferenceResponse(familyId, null, null);
		}

		return toResponse(record);
	}

	public FamilySelectionPreferenceResponse updatePreference(FamilySelectionPreferenceRequest request) {
		if (request.familyId() == null) {
			throw new IllegalArgumentException("familyId는 필수입니다.");
		}

		validateFamily(request.familyId());

		if (request.selectedChildId() != null) {
			ChildProfile child = parentControlMapper.findChildById(request.selectedChildId());
			if (child == null) {
				throw new IllegalArgumentException("선택한 자녀 정보를 찾을 수 없습니다.");
			}

			if (child.userId() != request.familyId()) {
				throw new IllegalArgumentException("선택한 자녀가 현재 가족에 속하지 않습니다.");
			}
		}

		FamilySelectionPreferenceRecord record = new FamilySelectionPreferenceRecord();
		record.setFamilyId(request.familyId());
		record.setSelectedChildId(request.selectedChildId());
		familySelectionPreferenceMapper.upsert(record);
		return getPreference(request.familyId());
	}

	private void validateFamily(int familyId) {
		String familyName = parentControlMapper.findFamilyNameById(familyId);
		if (!StringUtils.hasText(familyName)) {
			throw new IllegalArgumentException("가족 정보를 찾을 수 없습니다.");
		}
	}

	private FamilySelectionPreferenceResponse toResponse(FamilySelectionPreferenceRecord record) {
		LocalDateTime updatedAt = record.getUpdatedAt();
		return new FamilySelectionPreferenceResponse(
			record.getFamilyId(),
			record.getSelectedChildId(),
			updatedAt
		);
	}
}
