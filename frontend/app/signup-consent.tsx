import { useState } from "react";
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, TouchableOpacity, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const C = {
  primary:   "#4F46E5",
  primaryBg: "#EDEDFF",
  text:      "#0F172A",
  sub:       "#64748B",
  border:    "#E2E8F0",
  card:      "#FFFFFF",
  bg:        "#F8FAFC",
};

// ─────────────────────────────────────────
// 약관 전문 콘텐츠
// ─────────────────────────────────────────
const TERMS_SERVICE = `제1장 총칙

제1조 (목적)
이 약관은 뚝딱(이하 "회사")이 제공하는 주거 하자 진단 AI 플랫폼(이하 "서비스")의 이용에 관한 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
본 약관에서 사용하는 용어의 정의는 다음과 같습니다.
 1. "서비스" 란 DDuckTack이 제공하는 주거 하자 진단 AI 플랫폼 및 관련 부가 기능 전체를 의미합니다.
 2. "회원" 이란 본 약관에 동의하고 DDuckTack 서비스를 이용하는 회원을 의미합니다.
 3. "주거 하자" 란 균열, 누수, 곰팡이 등 주거 공간에서 발생하는 물리적 결함을 의미합니다.
 4. "AI 진단" 이란 이용자가 업로드한 사진을 기반으로 인공지능이 주거 하자 여부 및 위험도를 분석하는 기능을 의미합니다.
 5. "DIY 가이드" 란 AI 진단 결과에 따라 이용자가 직접 하자를 수리할 수 있도록 제공되는 단계별 안내를 의미합니다.
 6. "제휴 전문가" 란 DDuckTack과 사전 계약을 맺고 이용자에게 수리 서비스를 제공하는 업체 또는 개인을 의미합니다.
 7. "진단 보고서" 란 AI 진단 결과 및 수리 내역을 PDF 형식으로 정리한 증빙 문서를 의미합니다.
 8. "계정정보" 란 회원이 서비스 이용을 위해 제공한 이름, 이메일, 전화번호, 거주 지역, 주거 유형 및 서비스 이용 기록 등을 통칭합니다.

제3조 (약관의 효력 및 변경)
 1. 회사는 이 약관의 내용을 이용자가 알 수 있도록 서비스 내 또는 연결화면에 게시합니다.
 2. 약관을 개정할 경우 적용일자 및 개정 사유를 명시하여 적용일 7일 이전부터 공지합니다. 다만, 이용자에게 불리한 변경의 경우 30일 이전에 공지합니다.
 3. 이용자가 개정 약관에 동의하지 않는 경우 서비스 이용계약을 해지할 수 있습니다.

제4조 (약관 외 준칙)
이 약관에서 정하지 않은 사항은 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「개인정보보호법」 등 관련 법령 및 일반 상관례에 따릅니다.

제2장 이용계약

제5조 (이용계약의 체결)
 1. 이용계약은 가입신청자가 약관에 동의한 후 서비스 이용을 신청하고, 회사가 이를 승낙함으로써 체결됩니다.
 2. 회사는 다음 각 호에 해당하는 경우 승낙을 거절할 수 있습니다.
  - 허위 정보를 기재한 경우
  - 타인의 명의를 도용한 경우
  - 기타 부적절하다고 판단되는 경우

제6조 (회원정보의 관리)
 1. 이용자는 계정정보를 정확하게 유지할 책임이 있습니다.
 2. 계정 관리 소홀로 인해 발생한 손해에 대해 회사는 책임을 지지 않습니다.

제3장 서비스 이용

제7조 (서비스 내용)
DDuckTack은 다음의 서비스를 제공합니다.
 1. 사진 기반 AI 주거 하자 진단 및 위험도 분석
 2. 진단 결과에 따른 DIY 가이드 제공
 3. DIY 가이드 내 관련 상품 안내 (쿠팡 제휴 상품 포함)
 4. 전문가 연결 서비스
 5. 진단 및 수리 내역 PDF 보고서 발급

제8조 (AI 진단의 한계)
 1. AI 진단 결과는 참고용이며, 정확한 하자 판단은 전문가 확인이 필요합니다.
 2. 진단 결과의 오류로 인해 발생한 손해에 대해 회사는 법적 책임을 지지 않습니다.

제9조 (제휴 업체 및 광고)
 1. DIY 가이드 내 일부 상품은 쿠팡 파트너스 제휴를 통한 광고 상품이 포함될 수 있으며, 구매 시 소정의 수수료가 발생할 수 있습니다.
 2. 전문가 연결 목록 내 제휴 업체는 상단에 우선 노출될 수 있으며, 해당 업체에는 [광고] 또는 [제휴] 표시가 제공됩니다.
 3. 제휴 업체의 서비스 품질 및 결과에 대해 회사는 책임을 지지 않습니다.

제10조 (PDF 보고서)
 1. 발급된 PDF 보고서는 수리 내역 증빙 목적으로 활용할 수 있습니다.
 2. 본 보고서는 법적 효력이 필요한 공식 서류를 대체하지 않습니다.

제11조 (서비스의 변경 및 중단)
 1. 회사는 운영상 필요에 따라 서비스 내용을 변경할 수 있으며, 변경 전 서비스 내에 공지합니다.
 2. 천재지변, 시스템 장애 등 불가피한 사유로 서비스가 중단될 수 있으며, 이 경우 회사는 지체 없이 이를 공지합니다.

제4장 이용자의 의무

제12조 (이용자의 금지행위)
이용자는 다음 행위를 해서는 안 됩니다.
 1. 타인의 정보를 도용하거나 허위 정보를 입력하는 행위
 2. 허위 사진 또는 조작된 정보를 업로드하여 진단 결과를 왜곡하는 행위
 3. 서비스를 통해 얻은 정보를 무단으로 복제·배포·상업적으로 이용하는 행위
 4. 전문가 연결 서비스를 악용하거나 부정한 목적으로 이용하는 행위
 5. 기타 관련 법령 또는 공서양속에 반하는 행위

제5장 개인정보 보호

제13조 (개인정보의 보호)
 1. 회사는 관련 법령에 따라 이용자의 개인정보를 보호하며, 개인정보의 수집·이용·보관에 관한 사항은 별도의 개인정보 처리방침에 따릅니다.
 2. 회사는 법령에 의한 요청이 있는 경우를 제외하고 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
 3.  이용자의 귀책사유로 개인정보가 유출된 경우 회사는 이에 대한 책임을 지지 않습니다.

제6장 계약 해지

제14조 (계약 해지 및 탈퇴)
 1. 이용자는 언제든지 서비스 내 탈퇴 기능을 통해 이용계약을 해지할 수 있습니다.
 2. 회원 탈퇴 시 계정정보 및 진단 기록은 삭제되며 복구가 불가능합니다.
 3. 회사는 이용자가 이 약관의 금지 행위를 한 경우 사전 통지 후 이용계약을 해지할 수 있습니다.

제7장 손해배상 및 면책

제15조 (손해배상)
 1. 회사 또는 이용자가 이 약관을 위반하여 상대방에게 손해를 입힌 경우 그 손해를 배상할 책임이 있습니다. 단, 고의 또는 과실이 없는 경우에는 그러하지 않습니다.

제16조 (면책 조항)
 1. 회사는 다음의 경우 책임을 지지 않습니다.
  - AI 진단 결과의 오류로 인한 손해
  - 제휴 업체 또는 전문가의 서비스 불량으로 인한 손해
  - 이용자의 허위 정보 입력으로 인한 결과
  - 천재지변 등 불가항력적 사유로 인한 서비스 중단
  - 이용자 간 또는 이용자와 제휴 전문가 간 발생한 분쟁

제8장 기타

제17조 (이용자에 대한 통지)
 1. 회사가 이용자에게 통지를 하는 경우 가입 시 등록한 이메일 또는 전화번호, 앱 푸시 알림 등의 방법으로 할 수 있습니다.

제18조 (고충처리 및 분쟁 해결)
 1. 이용자는 서비스 내 고객센터를 통해 의견 및 불만을 제기할 수 있습니다.
 2. 회사는 정당한 의견 및 불만에 대해 합리적인 기간 내에 처리하고 그 결과를 통지합니다.

제19조 (재판권 및 준거법)
 1. 이 약관은 대한민국 법률에 따라 규율되며, 분쟁 발생 시 관련 법령에 따른 법원을 관할 법원으로 합니다.

시행일: 2025년 1월 1일`;

const TERMS_PRIVACY = `뚝딱(이하 "회사")은 개인정보 보호법 제30조에 따라 이용자의 개인정보를 보호하고 관련 고충을 신속히 처리하기 위해 다음과 같이 개인정보 처리방침을 수립·공개합니다.

제1조 (수집하는 개인정보 항목 및 수집 방법)
 1. 수집 항목
  - 필수: 이메일 주소, 비밀번호(암호화 저장), 거주 지역, 주거 형태, 임대 유형
  - 자동 생성: 진단 이미지, 진단 기록, 접속 IP 주소, 기기 정보, 서비스 이용 기록
 2. 수집 방법: 회원가입 시 이용자 직접 입력, 서비스 이용 시 자동 수집

제2조 (개인정보의 수집 및 이용 목적)
 1. 회원 식별 및 본인 확인
 2. 서비스(AI 진단, DIY 가이드, 전문업체 연결) 제공
 3. 진단 기록 보관 및 PDF 리포트 발급
 4. 고객 문의 및 분쟁 처리
 5. 서비스 품질 개선 및 통계 분석

제3조 (동의 거부 및 불이익 안내)
귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있습니다.
  - [필수 정보] 필수 수집 항목에 대한 동의를 거절하는 경우, 회원 가입 및 서비스 이용이 제한될 수 있습니다.

제4조 (개인정보의 보유 및 이용 기간)
  - 회원 탈퇴 시 즉시 파기
    (단, 법령에 따라 보존 의무가 있는 경우 해당 기간 동안 보관)
  - 전자상거래 관련 기록: 5년
    (전자상거래 등에서의 소비자보호에 관한 법률)
  - 접속 로그 기록: 3개월
    (통신비밀보호법)

제5조 (개인정보의 파기)
회원 탈퇴 또는 보존 기간 경과 시 지체 없이 파기합니다. 전자적 파일은 복구 불가능한 방법으로 영구 삭제합니다.

제6조 (개인정보의 제3자 제공)
회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 이용자의 사전 동의가 있거나 법령에 따른 경우에는 예외로 합니다.

제7조 (개인정보 처리 위탁)
서비스 운영을 위해 아래와 같이 개인정보 처리 업무를 위탁할 수 있습니다.
  - 클라우드 인프라 서비스 업체 (서버 운영 및 데이터 보관)
    위탁 업체는 개인정보 보호 관련 법령 준수 의무를 부과받습니다.

제8조 (정보주체의 권리·의무 및 행사 방법)
이용자는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다. 마이페이지 또는 고객센터를 통해 요청할 수 있으며, 회사는 지체 없이 조치합니다.

제9조 (개인정보 보호 책임자)
  - 담당 부서: 서비스운영팀
  - 이메일: privacy@dduckttack.com

시행일: 2025년 1월 1일`;

const TERMS_MARKETING = `마케팅 정보 수신 동의 (선택사항)

뚝딱 서비스와 관련한 이벤트, 프로모션, 새로운 기능 안내, 제휴 혜택 등 유용한 정보를 알려드립니다.

■ 수신 채널
  - 앱 내 푸시 알림
  - 이메일

■ 제공하는 정보
  - 신규 기능 및 서비스 업데이트 안내
  - 이벤트·프로모션 안내
  - 전문업체 제휴 할인 혜택
  - DIY 팁 및 주택 관리 콘텐츠

■ 개인정보 이용 내역
  - 이용 항목: 이메일 주소, 서비스 이용 기록
  - 이용 목적: 맞춤형 마케팅 정보 발송
  - 보유 기간: 동의 철회 시까지

■ 거부 권리 안내
본 동의는 선택 사항이며, 동의하지 않으셔도 기본 서비스 이용에 불이익이 없습니다.
동의 후에도 마이페이지 > 알림 설정에서 언제든지 수신 거부가 가능합니다.`;

type TermsKey = "service" | "privacy" | "marketing";

const TERMS_TITLES: Record<TermsKey, string> = {
  service:   "서비스 이용약관",
  privacy:   "개인정보 수집 및 이용",
  marketing: "마케팅 정보 수신 동의",
};

const TERMS_CONTENT: Record<TermsKey, string> = {
  service:   TERMS_SERVICE,
  privacy:   TERMS_PRIVACY,
  marketing: TERMS_MARKETING,
};

// ─────────────────────────────────────────

function CheckboxRow({
  label,
  checked,
  onPress,
  description,
  required = false,
  onViewTerms,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  description: string;
  required?: boolean;
  onViewTerms?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.checkboxCard, checked && styles.checkboxCardActive]}
    >
      <View style={styles.checkboxTopRow}>
        <View style={[styles.customCheckbox, checked && styles.customCheckboxChecked]}>
          {checked && <Ionicons name="checkmark" size={14} color="white" />}
        </View>
        <Text style={styles.checkboxLabel}>
          <Text style={{ color: required ? C.primary : "#94A3B8", fontWeight: "700" }}>
            {required ? "[필수] " : "[선택] "}
          </Text>
          {label}
        </Text>
        {onViewTerms && (
          <Pressable
            onPress={(e) => { e.stopPropagation(); onViewTerms(); }}
            hitSlop={8}
            style={styles.viewTermsBtn}
          >
            <Text style={styles.viewTermsText}>전문 보기</Text>
            <Ionicons name="chevron-forward" size={11} color={C.primary} />
          </Pressable>
        )}
      </View>
      <Text style={styles.checkboxDescription}>{description}</Text>
    </Pressable>
  );
}

export default function SignupConsentPage() {
  const [serviceChecked,   setServiceChecked]   = useState(false);
  const [privacyChecked,   setPrivacyChecked]   = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);
  const [activeTerms,      setActiveTerms]      = useState<TermsKey | null>(null);

  const allRequiredChecked = serviceChecked && privacyChecked;
  const isAllAgree = serviceChecked && privacyChecked && marketingChecked;

  // --- [원본 로직 100% 유지] ---
  function handleContinue() {
    if (!allRequiredChecked) {
      Alert.alert("동의 필요", "필수 동의 항목을 모두 체크해야 회원가입을 진행할 수 있습니다.");
      return;
    }
    router.replace("/signup?consent=1");
  }

  function handleAllAgree() {
    const next = !isAllAgree;
    setServiceChecked(next);
    setPrivacyChecked(next);
    setMarketingChecked(next);
  }
  // --- [원본 로직 끝] ---

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>약관 동의</Text>
          <Text style={styles.headerSub}>안전한 서비스 이용을 위해{"\n"}약관에 동의해주세요</Text>
        </View>

        {/* 전체 동의 버튼 */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAllAgree}
          style={[styles.allAgreeButton, isAllAgree && styles.allAgreeButtonActive]}
        >
          <View style={[styles.allAgreeIcon, isAllAgree && styles.allAgreeIconActive]}>
            <Ionicons
              name={isAllAgree ? "checkmark" : "checkmark"}
              size={16}
              color={isAllAgree ? C.primary : "#CBD5E1"}
            />
          </View>
          <Text style={[styles.allAgreeText, isAllAgree && styles.allAgreeTextActive]}>
            모든 약관에 전체 동의합니다
          </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* 개별 약관 */}
        <View style={styles.checkboxList}>
          <CheckboxRow
            required
            checked={serviceChecked}
            onPress={() => setServiceChecked(!serviceChecked)}
            label="서비스 이용약관"
            description="AI 진단, DIY 가이드, 전문업체 연결 등 서비스 제공에 관한 기본 약관입니다."
            onViewTerms={() => setActiveTerms("service")}
          />
          <CheckboxRow
            required
            checked={privacyChecked}
            onPress={() => setPrivacyChecked(!privacyChecked)}
            label="개인정보 수집 및 이용"
            description="이메일·거주 정보를 수집하며, 탈퇴 시 즉시 파기합니다. (개인정보 보호법 준수)"
            onViewTerms={() => setActiveTerms("privacy")}
          />
          <CheckboxRow
            checked={marketingChecked}
            onPress={() => setMarketingChecked(!marketingChecked)}
            label="마케팅 정보 수신"
            description="이벤트·혜택·업데이트 안내를 수신합니다. 미동의 시에도 서비스 이용에 불이익이 없습니다."
            onViewTerms={() => setActiveTerms("marketing")}
          />
        </View>

        {/* 약관 전문 모달 */}
        <Modal
          visible={activeTerms !== null}
          animationType="slide"
          transparent
          statusBarTranslucent
          onRequestClose={() => setActiveTerms(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              {/* 모달 헤더 */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {activeTerms ? TERMS_TITLES[activeTerms] : ""}
                </Text>
                <Pressable onPress={() => setActiveTerms(null)} style={styles.modalCloseBtn} hitSlop={12}>
                  <Ionicons name="close" size={20} color="#475569" />
                </Pressable>
              </View>
              {/* 약관 본문 */}
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalBody}>
                  {activeTerms ? TERMS_CONTENT[activeTerms] : ""}
                </Text>
              </ScrollView>
              {/* 확인 버튼 */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveTerms(null)}
                  style={styles.modalConfirmBtn}
                >
                  <Text style={styles.modalConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* 하단 버튼 */}
        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleContinue}
            style={[styles.mainButton, !allRequiredChecked && styles.mainButtonDisabled]}
          >
            <Text style={styles.mainButtonText}>회원가입 계속하기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>로그인으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48 },

  header:      { marginBottom: 28 },
  headerTitle: { fontSize: 30, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  headerSub:   { fontSize: 15, color: "#64748B", marginTop: 10, lineHeight: 24 },

  allAgreeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    gap: 14,
  },
  allAgreeButtonActive: {
    backgroundColor: C.primaryBg,
    borderColor: "#C7D2FE",
  },
  allAgreeIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  allAgreeIconActive: {
    backgroundColor: C.primaryBg,
    borderColor: C.primary,
  },
  allAgreeText:       { fontSize: 16, fontWeight: "700", color: "#475569" },
  allAgreeTextActive: { color: C.primary },

  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 24 },

  checkboxList: { gap: 12 },
  checkboxCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  checkboxCardActive: {
    borderColor: "#C7D2FE",
    backgroundColor: C.primaryBg,
  },
  checkboxTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  customCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  customCheckboxChecked: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  checkboxLabel:       { fontSize: 15, fontWeight: "700", color: "#1E293B", flex: 1 },
  checkboxDescription: { fontSize: 13, color: "#64748B", lineHeight: 20, paddingLeft: 34 },

  viewTermsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: C.primaryBg,
  },
  viewTermsText: { fontSize: 11, fontWeight: "700", color: C.primary },

  // ── 약관 전문 모달 ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalBody: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 22,
    fontWeight: "400",
  },
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalConfirmBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  footer:     { marginTop: 44, gap: 12 },
  mainButton: {
    backgroundColor: C.primary,
    paddingVertical: 19,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  mainButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  mainButtonText: { color: "white", fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
  backButton:     { paddingVertical: 12, alignItems: "center" },
  backButtonText: { color: "#94A3B8", fontSize: 14, fontWeight: "500" },
});
