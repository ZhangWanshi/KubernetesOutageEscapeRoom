package com.team5.kubernetesoutageescaperoom.service;

import com.team5.kubernetesoutageescaperoom.dto.ActionOptionDto;
import com.team5.kubernetesoutageescaperoom.dto.EvidenceDto;
import com.team5.kubernetesoutageescaperoom.dto.RoomDetailsDto;
import com.team5.kubernetesoutageescaperoom.dto.RoomSummaryDto;
import com.team5.kubernetesoutageescaperoom.exception.NotFoundException;
import com.team5.kubernetesoutageescaperoom.model.ActionOption;
import com.team5.kubernetesoutageescaperoom.model.Evidence;
import com.team5.kubernetesoutageescaperoom.model.Room;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class RoomService {

    private final Map<Integer, Room> rooms;

    public RoomService() {
        this.rooms = Map.of(
            1, buildRoom1(),
            2, buildRoom2()
        );
    }

    public List<RoomSummaryDto> getRooms() {
        return rooms.values().stream()
                .sorted((a, b) -> Integer.compare(a.getRoomId(), b.getRoomId()))
                .map(this::toSummary)
                .toList();
    }

    public RoomDetailsDto getRoomDetails(int roomId) {
        return toDetails(getRoom(roomId));
    }

    public Room getRoom(int roomId) {
        Room room = rooms.get(roomId);
        if (room == null) throw new NotFoundException("Room not found");
        return room;
    }

    public boolean actionExists(int roomId, String selectedActionId) {
        Room room = rooms.get(roomId);
        if (room == null) return false;
        return room.getActions().stream()
                .anyMatch(action -> action.getId().equalsIgnoreCase(selectedActionId));
    }

    public int getTotalRooms() {
        return rooms.size();
    }

    private Room buildRoom1() {
        Room room = new Room();
        room.setRoomId(1);
        room.setName("Readiness Probe Failure");
        room.setTheme("jungle");
        room.setDifficulty("EASY");
        room.setFailureArea("Kubernetes / Networking");
        room.setTimeLimitSeconds(300);
        room.setStory("The 5G network API pods are running but not receiving traffic.");
        room.setEvidence(List.of(
                new Evidence("LOG", "Readiness Probe Log", "Readiness probe failed: HTTP 503"),
                new Evidence("STATUS", "Service Status", "Service has no ready endpoints"),
                new Evidence("POD", "Pod Status", "Pod status: Running, but 0/1 ready")
        ));
        room.setActions(List.of(
                new ActionOption("restart-pod", "Restart the pod"),
                new ActionOption("fix-readiness-probe", "Fix the readiness probe configuration"),
                new ActionOption("increase-memory", "Increase memory limits")
        ));
        room.setCorrectActionId("fix-readiness-probe");
        room.setHints(List.of(
                "Check the pod's readiness probe configuration. The probe is failing, preventing the pod from receiving traffic."
        ));
        room.setRootCause("The readiness probe was misconfigured and returning HTTP 503, causing the pod to be removed from service endpoints.");
        room.setLearningPoint("A running pod is not necessarily a ready pod. Readiness probes control whether a pod receives traffic.");
        return room;
    }

    private Room buildRoom2() {
        Room room = new Room();
        room.setRoomId(2);
        room.setName("CrashLoopBackOff in the Desert");
        room.setTheme("desert");
        room.setDifficulty("MEDIUM");
        room.setFailureArea("Kubernetes / Configuration");
        room.setTimeLimitSeconds(300);
        room.setStory("A critical payment service pod keeps restarting in the desert cluster.");
        room.setEvidence(List.of(
                new Evidence("STATUS", "Pod Status", "Pod status: CrashLoopBackOff"),
                new Evidence("LOG", "Pod Logs", "kubectl logs: Error: DATABASE_URL environment variable not set"),
                new Evidence("CONFIG", "ConfigMap Status", "ConfigMap 'payment-config' exists but is not mounted"),
                new Evidence("SPEC", "Deployment Spec", "Deployment spec missing envFrom reference")
        ));
        room.setActions(List.of(
                new ActionOption("restart-deployment", "Restart the deployment"),
                new ActionOption("increase-cpu-limit", "Increase CPU limits"),
                new ActionOption("mount-configmap", "Mount the ConfigMap into the deployment")
        ));
        room.setCorrectActionId("mount-configmap");
        room.setHints(List.of(
                "The pod is missing environment variables. Check if the ConfigMap exists and whether it's properly referenced in the deployment."
        ));
        room.setRootCause("The ConfigMap 'payment-config' existed but was never referenced in the deployment's envFrom, so DATABASE_URL was never injected.");
        room.setLearningPoint("ConfigMaps must be explicitly mounted or referenced in a deployment spec — their existence alone does not make them available to pods.");
        return room;
    }

    private RoomSummaryDto toSummary(Room room) {
        return new RoomSummaryDto(
                room.getRoomId(),
                room.getName(),
                room.getTheme(),
                room.getDifficulty(),
                room.getFailureArea(),
                false
        );
    }

    private RoomDetailsDto toDetails(Room room) {
        return new RoomDetailsDto(
                room.getRoomId(),
                room.getName(),
                room.getTheme(),
                room.getDifficulty(),
                room.getFailureArea(),
                room.getTimeLimitSeconds(),
                room.getStory(),
                room.getEvidence().stream().map(this::toEvidenceDto).toList(),
                room.getActions().stream().map(this::toActionDto).toList()
        );
    }

    private EvidenceDto toEvidenceDto(Evidence evidence) {
        return new EvidenceDto(evidence.getType(), evidence.getTitle(), evidence.getContent());
    }

    private ActionOptionDto toActionDto(ActionOption action) {
        return new ActionOptionDto(action.getId(), action.getText());
    }
}
